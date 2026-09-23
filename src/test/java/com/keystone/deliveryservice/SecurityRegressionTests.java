package com.keystone.deliveryservice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.keystone.deliveryservice.DTO.LogPartsDTO;
import com.keystone.deliveryservice.DTO.LogTimeDTO;
import com.keystone.deliveryservice.DTO.RegisterRequestDTO;
import com.keystone.deliveryservice.DTO.TransitionStatusDTO;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Part;
import com.keystone.deliveryservice.Entity.PartUsage;
import com.keystone.deliveryservice.Entity.TimeLog;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Repository.CustomerRepository;
import com.keystone.deliveryservice.Repository.PartRepository;
import com.keystone.deliveryservice.Repository.PartUsageRepository;
import com.keystone.deliveryservice.Repository.SiteRepository;
import com.keystone.deliveryservice.Repository.TimeLogRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;
import com.keystone.deliveryservice.Repository.WorkOrderStatusHistoryRepository;
import com.keystone.deliveryservice.Security.JWTUtil;
import com.keystone.deliveryservice.Security.TokenKillingService;
import com.keystone.deliveryservice.Service.EmailLogService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;
import com.keystone.deliveryservice.Service.UserAuthService;
import com.keystone.deliveryservice.Service.WorkOrderServiceImpl;

@ExtendWith(MockitoExtension.class)
class SecurityRegressionTests {

    @Mock private UserAuthRepository userRepository;
    @Mock private JWTUtil jwtUtil;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailLogService emailLogService;
    @Mock private TokenKillingService tokenKillingService;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private WorkOrderStatusHistoryRepository historyRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private SiteRepository siteRepository;
    @Mock private PartRepository partRepository;
    @Mock private PartUsageRepository partUsageRepository;
    @Mock private TimeLogRepository timeLogRepository;

    @InjectMocks private UserAuthService userAuthService;
    @InjectMocks private WorkOrderServiceImpl workOrderService;

    @Test
    void anonymousRegistrationAlwaysCreatesCustomerRole() {
        RegisterRequestDTO request = RegisterRequestDTO.builder()
                .userName("New Customer")
                .userEmail("new@example.com")
                .password("secure-password")
                .phone("555-0104")
                .build();

        when(userRepository.existsByUserEmail(request.getUserEmail())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded");
        when(userRepository.save(any(UserAuth.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtUtil.generateToken(any(UserAuth.class))).thenReturn("signed-token");

        assertEquals(Role.CUSTOMER, userAuthService.register(request).getRole());

        ArgumentCaptor<UserAuth> savedUser = ArgumentCaptor.forClass(UserAuth.class);
        verify(userRepository).save(savedUser.capture());
        assertEquals(Role.CUSTOMER, savedUser.getValue().getRole());
    }

    @Test
    void customerCannotAccessAnotherOrganization() {
        Authentication authentication = org.mockito.Mockito.mock(Authentication.class);
        UserAuth customerUser = UserAuth.builder()
                .id(4L)
                .userEmail("customer@example.com")
                .role(Role.CUSTOMER)
                .build();
        Customer anotherCustomer = Customer.builder()
                .id(99L)
                .email("other@example.com")
                .build();

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(customerUser.getUserEmail());
        when(userRepository.findByUserEmail(customerUser.getUserEmail())).thenReturn(Optional.of(customerUser));

        ResourceAuthorizationService authorizationService = new ResourceAuthorizationService(userRepository);

        assertThrows(AccessDeniedException.class,
                () -> authorizationService.requireCustomerAccess(anotherCustomer, authentication));
    }

    @Test
    void unassignedTechnicianCannotLogPartsOrTime() {
        UserAuth assignedTechnician = UserAuth.builder().id(3L).role(Role.TECHNICIAN).build();
        UserAuth otherTechnician = UserAuth.builder().id(44L).role(Role.TECHNICIAN).build();
        WorkOrder workOrder = WorkOrder.builder()
                .id(1L)
                .status(WorkOrderStatus.IN_PROGRESS)
                .assignedTo(assignedTechnician)
                .build();

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));

        assertThrows(AccessDeniedException.class,
                () -> workOrderService.logParts(1L, LogPartsDTO.builder().partId(1L).quantity(1).build(), otherTechnician));
        assertThrows(AccessDeniedException.class,
                () -> workOrderService.logTime(1L, LogTimeDTO.builder().minutes(15).build(), otherTechnician));

        verify(partRepository, never()).findByIdForUpdate(any());
        verify(partUsageRepository, never()).save(any(PartUsage.class));
        verify(timeLogRepository, never()).save(any(TimeLog.class));
    }

    @Test
    void insufficientStockIsRejectedBeforeAnyInventoryWrite() {
        UserAuth technician = UserAuth.builder().id(3L).role(Role.TECHNICIAN).userName("Tech").build();
        WorkOrder workOrder = WorkOrder.builder()
                .id(1L)
                .status(WorkOrderStatus.IN_PROGRESS)
                .assignedTo(technician)
                .totalPartsCost(0.0)
                .build();
        Part part = Part.builder()
                .id(7L)
                .name("Last filter")
                .unitCost(10.0)
                .stockQty(1)
                .build();

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(partRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(part));

        assertThrows(IllegalArgumentException.class,
                () -> workOrderService.logParts(1L,
                        LogPartsDTO.builder().partId(7L).quantity(2).build(), technician));

        assertEquals(1, part.getStockQty());
        verify(partRepository, never()).save(any(Part.class));
        verify(partUsageRepository, never()).save(any(PartUsage.class));
        verify(workOrderRepository, never()).save(any(WorkOrder.class));
    }

    @Test
    void lifecycleRejectsStatusJumps() {
        UserAuth manager = UserAuth.builder().id(1L).role(Role.MANAGER).build();
        WorkOrder workOrder = WorkOrder.builder().id(10L).status(WorkOrderStatus.NEW).build();
        when(workOrderRepository.findById(10L)).thenReturn(Optional.of(workOrder));

        assertThrows(IllegalStateException.class,
                () -> workOrderService.transitionStatus(10L,
                        TransitionStatusDTO.builder().status(WorkOrderStatus.COMPLETED).build(), manager));

        assertEquals(WorkOrderStatus.NEW, workOrder.getStatus());
        verify(workOrderRepository, never()).save(any(WorkOrder.class));
    }

    @Test
    void onlyManagerCanCloseCompletedWorkOrder() {
        UserAuth dispatcher = UserAuth.builder().id(2L).role(Role.DISPATCHER).build();
        WorkOrder workOrder = WorkOrder.builder().id(11L).status(WorkOrderStatus.COMPLETED).build();
        when(workOrderRepository.findById(11L)).thenReturn(Optional.of(workOrder));

        assertThrows(AccessDeniedException.class,
                () -> workOrderService.transitionStatus(11L,
                        TransitionStatusDTO.builder().status(WorkOrderStatus.CLOSED).build(), dispatcher));

        assertEquals(WorkOrderStatus.COMPLETED, workOrder.getStatus());
        verify(workOrderRepository, never()).save(any(WorkOrder.class));
    }
}
