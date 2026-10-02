package com.keystone.deliveryservice.Service;

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
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.CustomerRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

@Service
@Transactional
public class UserManagementService {
    private final UserAuthRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    public UserManagementService(UserAuthRepository userRepository, CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Page<UserResponseDTO> list(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<UserResponseDTO> listTechnicians() {
        return userRepository.findByRole(Role.TECHNICIAN).stream().map(this::toResponse).toList();
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
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
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
        return UserResponseDTO.builder()
                .id(user.getId())
                .userName(user.getUserName())
                .userEmail(user.getUserEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .customerId(user.getCustomerId())
                .build();
    }
}
