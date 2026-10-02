package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.CreateUserDTO;
import com.keystone.deliveryservice.DTO.UpdateUserDTO;
import com.keystone.deliveryservice.DTO.UserResponseDTO;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.CustomerRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;

@Service
@Transactional
public class UserManagementService {
    private final UserAuthRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final WorkOrderRepository workOrderRepository;

    public UserManagementService(UserAuthRepository userRepository, CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder, WorkOrderRepository workOrderRepository) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.workOrderRepository = workOrderRepository;
    }

    @Transactional(readOnly = true)
    public Page<UserResponseDTO> list(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    // Statuses that count as a technician's current workload.
    private static final List<WorkOrderStatus> OPEN_JOB_STATUSES =
            List.of(WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD);

    /** Technicians with their location, availability and current number of open jobs. */
    @Transactional(readOnly = true)
    public List<UserResponseDTO> listTechnicians() {
        return userRepository.findByRole(Role.TECHNICIAN).stream()
                .map(technician -> {
                    UserResponseDTO dto = toResponse(technician);
                    dto.setCurrentJobs(workOrderRepository.countByAssignedToIdAndStatusIn(technician.getId(), OPEN_JOB_STATUSES));
                    return dto;
                })
                .sorted(Comparator.comparing((UserResponseDTO t) -> !Boolean.TRUE.equals(t.getAvailable()))
                        .thenComparing(UserResponseDTO::getCurrentJobs)
                        .thenComparing(UserResponseDTO::getUserName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public UserResponseDTO create(CreateUserDTO request) {
        if (userRepository.existsByUserEmail(request.getUserEmail())) {
            throw new IllegalArgumentException("A user with this email already exists");
        }

        UserAuth user = UserAuth.builder()
                .userName(request.getUserName())
                .userEmail(request.getUserEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .customerId(resolveCustomerId(request.getRole(), request.getCustomerId()))
                // Created by a manager, so the address does not need self-verification.
                .emailVerified(true)
                .location(request.getRole() == Role.TECHNICIAN ? blankToNull(request.getLocation()) : null)
                .available(true)
                .build();
        return toResponse(userRepository.save(user));
    }

    public UserResponseDTO update(Long id, UpdateUserDTO request) {
        UserAuth user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));
        user.setUserName(request.getUserName());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());
        user.setCustomerId(resolveCustomerId(request.getRole(), request.getCustomerId()));
        if (request.getRole() == Role.TECHNICIAN) {
            if (request.getLocation() != null) {
                user.setLocation(blankToNull(request.getLocation()));
            }
            if (request.getAvailable() != null) {
                user.setAvailable(request.getAvailable());
            }
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            // A manager-set password signs the user out everywhere.
            user.setPasswordChangedAt(LocalDateTime.now());
        }
        return toResponse(userRepository.save(user));
    }

    // Only CUSTOMER users carry an organisation link, and it must point at a real customer.
    private Long resolveCustomerId(Role role, Long customerId) {
        if (role != Role.CUSTOMER || customerId == null) {
            return null;
        }
        if (!customerRepository.existsById(customerId)) {
            throw new IllegalArgumentException("Customer not found with ID: " + customerId);
        }
        return customerId;
    }

    private UserResponseDTO toResponse(UserAuth user) {
        return UserResponseDTO.from(user);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
