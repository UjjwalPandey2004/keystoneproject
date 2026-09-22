package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.DTO.AssignWorkOrderDTO;
import com.keystone.deliveryservice.DTO.CreateWorkOrderDTO;
import com.keystone.deliveryservice.DTO.LogPartsDTO;
import com.keystone.deliveryservice.DTO.LogTimeDTO;
import com.keystone.deliveryservice.DTO.PartUsageDTO;
import com.keystone.deliveryservice.DTO.TimeLogDTO;
import com.keystone.deliveryservice.DTO.TransitionStatusDTO;
import com.keystone.deliveryservice.DTO.UpdateWorkOrderDTO;
import com.keystone.deliveryservice.DTO.WorkOrderResponseDTO;
import com.keystone.deliveryservice.DTO.WorkOrderStatusHistoryDTO;
import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Part;
import com.keystone.deliveryservice.Entity.PartUsage;
import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Entity.TimeLog;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Entity.WorkOrderStatusHistory;
import com.keystone.deliveryservice.Repository.PartRepository;
import com.keystone.deliveryservice.Repository.PartUsageRepository;
import com.keystone.deliveryservice.Repository.SiteRepository;
import com.keystone.deliveryservice.Repository.TimeLogRepository;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;
import com.keystone.deliveryservice.Repository.WorkOrderStatusHistoryRepository;
import com.keystone.deliveryservice.Repository.CustomerRepository;

@Service
@Transactional
public class WorkOrderServiceImpl implements WorkOrderService {

    @Autowired
    private WorkOrderRepository workOrderRepo;

    @Autowired
    private WorkOrderStatusHistoryRepository historyRepo;

    @Autowired
    private CustomerRepository customerRepo;

    @Autowired
    private SiteRepository siteRepo;

    @Autowired
    private UserAuthRepository userRepo;

    @Autowired
    private PartRepository partRepo;

    @Autowired
    private PartUsageRepository partUsageRepo;

    @Autowired
    private TimeLogRepository timeLogRepo;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Override
    public WorkOrderResponseDTO createWorkOrder(CreateWorkOrderDTO dto, UserAuth currentUser) {
        Customer customer = customerRepo.findById(dto.getCustomerId())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found with ID: " + dto.getCustomerId()));

        Site site = siteRepo.findById(dto.getSiteId())
                .orElseThrow(() -> new IllegalArgumentException("Site not found with ID: " + dto.getSiteId()));

        if (site.getCustomer().getId() != customer.getId()) {
            throw new IllegalArgumentException("Selected site does not belong to the selected customer");
        }

        // Customer can only raise requests for their own organization
        if (currentUser.getRole() == Role.CUSTOMER && !customer.getEmail().equalsIgnoreCase(currentUser.getUserEmail())) {
            throw new AccessDeniedException("You are only allowed to create work orders for your own organization");
        }

        UserAuth assignedTechnician = null;
        if (dto.getAssignedToId() != null) {
            assignedTechnician = userRepo.findById(dto.getAssignedToId())
                    .orElseThrow(() -> new IllegalArgumentException("Technician not found with ID: " + dto.getAssignedToId()));
        }

        // Generate unique code: WO-1001 etc.
        String code = generateUniqueWorkOrderCode();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime slaDueDate = now.plusHours(dto.getPriority().getSlaHours());

        WorkOrder workOrder = WorkOrder.builder()
                .code(code)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .priority(dto.getPriority())
                .status(assignedTechnician != null ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.NEW)
                .slaDueDate(slaDueDate)
                .slaBreached(false)
                .slaAtRisk(false)
                .customer(customer)
                .site(site)
                .assignedTo(assignedTechnician)
                .totalPartsCost(0.0)
                .totalLaborMinutes(0)
                .createdAt(now)
                .updatedAt(now)
                .build();

        workOrder = workOrderRepo.save(workOrder);

        // Record initial status in append-only history
        WorkOrderStatusHistory initialHistory = WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .fromStatus(null)
                .toStatus(workOrder.getStatus())
                .changedBy(currentUser)
                .changedAt(now)
                .notes("Work order raised: " + workOrder.getTitle())
                .build();
        historyRepo.save(initialHistory);

        return mapToDTO(workOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkOrderResponseDTO getWorkOrderById(Long id, UserAuth currentUser) {
        WorkOrder workOrder = workOrderRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found with ID: " + id));

        enforceReadAccess(workOrder, currentUser);
        return mapToDTO(workOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkOrderResponseDTO getWorkOrderByCode(String code, UserAuth currentUser) {
        WorkOrder workOrder = workOrderRepo.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found with code: " + code));

        enforceReadAccess(workOrder, currentUser);
        return mapToDTO(workOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkOrderResponseDTO> getWorkOrders(WorkOrderStatus status, Long customerId, Pageable pageable, UserAuth currentUser) {
        Page<WorkOrder> page;

        if (currentUser.getRole() == Role.CUSTOMER) {
            // Force customer scoped search
            Customer customer = customerRepo.findByEmail(currentUser.getUserEmail())
                    .orElseThrow(() -> new IllegalArgumentException("Customer profile not found for user: " + currentUser.getUserEmail()));

            if (status != null) {
                page = workOrderRepo.findByCustomerIdAndStatus(customer.getId(), status, pageable);
            } else {
                page = workOrderRepo.findByCustomerId(customer.getId(), pageable);
            }
        } else if (currentUser.getRole() == Role.TECHNICIAN) {
            // Force technician assigned jobs
            if (status != null) {
                page = workOrderRepo.findByAssignedToIdAndStatus(currentUser.getId(), status, pageable);
            } else {
                page = workOrderRepo.findByAssignedToId(currentUser.getId(), pageable);
            }
        } else {
            // Manager and Dispatcher can view all or filter
            if (customerId != null && status != null) {
                page = workOrderRepo.findByCustomerIdAndStatus(customerId, status, pageable);
            } else if (customerId != null) {
                page = workOrderRepo.findByCustomerId(customerId, pageable);
            } else if (status != null) {
                page = workOrderRepo.findByStatus(status, pageable);
            } else {
                page = workOrderRepo.findAll(pageable);
            }
        }

        List<WorkOrderResponseDTO> dtoList = page.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return new PageImpl<>(dtoList, pageable, page.getTotalElements());
    }

    @Override
    public WorkOrderResponseDTO updateWorkOrder(Long id, UpdateWorkOrderDTO dto, UserAuth currentUser) {
        WorkOrder workOrder = workOrderRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found with ID: " + id));

        if (workOrder.getStatus().isTerminal()) {
            throw new IllegalStateException("Work order is " + workOrder.getStatus() + " and cannot be modified.");
        }

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) {
            workOrder.setTitle(dto.getTitle());
        }
        if (dto.getDescription() != null) {
            workOrder.setDescription(dto.getDescription());
        }
        if (dto.getPriority() != null && dto.getPriority() != workOrder.getPriority()) {
            workOrder.setPriority(dto.getPriority());
            // Recalculate SLA due date
            workOrder.setSlaDueDate(workOrder.getCreatedAt().plusHours(dto.getPriority().getSlaHours()));
        }
        workOrder.setUpdatedAt(LocalDateTime.now());

        return mapToDTO(workOrderRepo.save(workOrder));
    }

    @Override
    public WorkOrderResponseDTO assignWorkOrder(Long id, AssignWorkOrderDTO dto, UserAuth currentUser) {
        WorkOrder workOrder = workOrderRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found with ID: " + id));

        if (workOrder.getStatus().isTerminal()) {
            throw new IllegalStateException("Cannot assign a terminal work order: " + workOrder.getStatus());
        }

        UserAuth technician = userRepo.findById(dto.getTechnicianId())
                .orElseThrow(() -> new IllegalArgumentException("Technician not found with ID: " + dto.getTechnicianId()));

        if (technician.getRole() != Role.TECHNICIAN) {
            throw new IllegalArgumentException("User " + technician.getUserEmail() + " is not a Technician.");
        }

        WorkOrderStatus previousStatus = workOrder.getStatus();
        workOrder.setAssignedTo(technician);
        workOrder.setStatus(WorkOrderStatus.ASSIGNED);
        workOrder.setUpdatedAt(LocalDateTime.now());

        workOrder = workOrderRepo.save(workOrder);

        // Audit log
        WorkOrderStatusHistory history = WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .fromStatus(previousStatus)
                .toStatus(WorkOrderStatus.ASSIGNED)
                .changedBy(currentUser)
                .changedAt(LocalDateTime.now())
                .notes("Assigned to " + technician.getUserName() + (dto.getNote() != null ? " - " + dto.getNote() : ""))
                .build();
        historyRepo.save(history);

        eventPublisher.publishEvent(new NotificationEvent(
                technician.getUserEmail(),
                "Work order assigned: " + workOrder.getCode(),
                "You have been assigned " + workOrder.getCode() + " - " + workOrder.getTitle()
                        + ". SLA due: " + workOrder.getSlaDueDate()));

        return mapToDTO(workOrder);
    }

    @Override
    public WorkOrderResponseDTO transitionStatus(Long id, TransitionStatusDTO dto, UserAuth currentUser) {
        WorkOrder workOrder = workOrderRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found with ID: " + id));

        WorkOrderStatus from = workOrder.getStatus();
        WorkOrderStatus to = dto.getStatus();

        // 1. Guarded state machine validation
        validateStateTransition(from, to, currentUser, workOrder);

        // 2. Perform transition
        workOrder.setStatus(to);
        LocalDateTime now = LocalDateTime.now();
        workOrder.setUpdatedAt(now);

        if (to == WorkOrderStatus.COMPLETED) {
            workOrder.setCompletedAt(now);
        } else if (to == WorkOrderStatus.CLOSED) {
            workOrder.setClosedAt(now);
        }

        workOrder = workOrderRepo.save(workOrder);

        // 3. Append-only audit record
        WorkOrderStatusHistory history = WorkOrderStatusHistory.builder()
                .workOrder(workOrder)
                .fromStatus(from)
                .toStatus(to)
                .changedBy(currentUser)
                .changedAt(now)
                .notes(dto.getNote())
                .build();
        historyRepo.save(history);

        return mapToDTO(workOrder);
    }

    @Override
    public PartUsageDTO logParts(Long id, LogPartsDTO dto, UserAuth currentUser) {
        WorkOrder workOrder = workOrderRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found with ID: " + id));

        enforceTechnicianAssignment(workOrder, currentUser);

        if (workOrder.getStatus().isTerminal()) {
            throw new IllegalStateException("Cannot log parts on a closed/cancelled work order.");
        }

        // Lock the inventory row until this transaction commits so concurrent
        // technicians cannot both consume the same remaining stock.
        Part part = partRepo.findByIdForUpdate(dto.getPartId())
                .orElseThrow(() -> new IllegalArgumentException("Part not found with ID: " + dto.getPartId()));

        // Check stock: Stock cannot go negative (Acceptance criteria F6)
        if (part.getStockQty() < dto.getQuantity()) {
            throw new IllegalArgumentException("Insufficient inventory stock for " + part.getName() + 
                    ". Available: " + part.getStockQty() + ", Requested: " + dto.getQuantity());
        }

        // Decrement stock
        part.setStockQty(part.getStockQty() - dto.getQuantity());
        partRepo.save(part);

        // Record PartUsage
        double totalCost = part.getUnitCost() * dto.getQuantity();
        PartUsage usage = PartUsage.builder()
                .workOrder(workOrder)
                .part(part)
                .quantityUsed(dto.getQuantity())
                .unitCost(part.getUnitCost())
                .totalCost(totalCost)
                .usedBy(currentUser)
                .usedAt(LocalDateTime.now())
                .build();
        usage = partUsageRepo.save(usage);

        // Roll up cost onto work order
        workOrder.setTotalPartsCost(workOrder.getTotalPartsCost() + totalCost);
        workOrder.setUpdatedAt(LocalDateTime.now());
        workOrderRepo.save(workOrder);

        return PartUsageDTO.builder()
                .id(usage.getId())
                .partId(part.getId())
                .partName(part.getName())
                .sku(part.getSku())
                .quantityUsed(usage.getQuantityUsed())
                .unitCost(usage.getUnitCost())
                .totalCost(usage.getTotalCost())
                .usedByName(currentUser.getUserName())
                .usedAt(usage.getUsedAt())
                .build();
    }

    @Override
    public TimeLogDTO logTime(Long id, LogTimeDTO dto, UserAuth currentUser) {
        WorkOrder workOrder = workOrderRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found with ID: " + id));

        enforceTechnicianAssignment(workOrder, currentUser);

        if (workOrder.getStatus().isTerminal()) {
            throw new IllegalStateException("Cannot log labor time on a closed/cancelled work order.");
        }

        TimeLog timeLog = TimeLog.builder()
                .workOrder(workOrder)
                .technician(currentUser)
                .minutes(dto.getMinutes())
                .note(dto.getNote())
                .loggedAt(LocalDateTime.now())
                .build();
        timeLog = timeLogRepo.save(timeLog);

        // Roll up labor minutes onto work order
        workOrder.setTotalLaborMinutes(workOrder.getTotalLaborMinutes() + dto.getMinutes());
        workOrder.setUpdatedAt(LocalDateTime.now());
        workOrderRepo.save(workOrder);

        return TimeLogDTO.builder()
                .id(timeLog.getId())
                .technicianId(currentUser.getId())
                .technicianName(currentUser.getUserName())
                .technicianEmail(currentUser.getUserEmail())
                .minutes(timeLog.getMinutes())
                .note(timeLog.getNote())
                .loggedAt(timeLog.getLoggedAt())
                .build();
    }

    // --- Guarded State Machine Transition Rules (Section 07) ---
    private void validateStateTransition(WorkOrderStatus from, WorkOrderStatus to, UserAuth user, WorkOrder workOrder) {
        if (from == to) {
            throw new IllegalStateException("Work order is already in state: " + from);
        }

        if (from.isTerminal()) {
            throw new IllegalStateException("Terminal state (" + from + ") cannot be transitioned further.");
        }

        Role role = user.getRole();

        // Allowed transitions as per Figure 4:
        switch (from) {
            case NEW:
                if (to == WorkOrderStatus.ASSIGNED) {
                    if (role != Role.MANAGER && role != Role.DISPATCHER) {
                        throw new AccessDeniedException("Only Dispatchers or Managers can assign work orders.");
                    }
                    if (workOrder.getAssignedTo() == null) {
                        throw new IllegalStateException("Cannot transition to ASSIGNED without an assigned technician.");
                    }
                    return;
                }
                if (to == WorkOrderStatus.CANCELLED) {
                    if (role != Role.MANAGER && role != Role.DISPATCHER) {
                        throw new AccessDeniedException("Only Dispatchers or Managers can cancel work orders.");
                    }
                    return;
                }
                break;

            case ASSIGNED:
                if (to == WorkOrderStatus.IN_PROGRESS) {
                    // Technician starts work
                    if (role != Role.MANAGER && (workOrder.getAssignedTo() == null || !workOrder.getAssignedTo().getId().equals(user.getId()))) {
                        throw new AccessDeniedException("Only the assigned technician can start this job.");
                    }
                    return;
                }
                if (to == WorkOrderStatus.CANCELLED) {
                    if (role != Role.MANAGER && role != Role.DISPATCHER) {
                        throw new AccessDeniedException("Only Dispatchers or Managers can cancel work orders.");
                    }
                    return;
                }
                break;

            case IN_PROGRESS:
                if (to == WorkOrderStatus.ON_HOLD || to == WorkOrderStatus.COMPLETED) {
                    if (role != Role.MANAGER && (workOrder.getAssignedTo() == null || !workOrder.getAssignedTo().getId().equals(user.getId()))) {
                        throw new AccessDeniedException("Only the assigned technician can hold or complete this job.");
                    }
                    return;
                }
                break;

            case ON_HOLD:
                if (to == WorkOrderStatus.IN_PROGRESS) {
                    // Resume work
                    if (role != Role.MANAGER && (workOrder.getAssignedTo() == null || !workOrder.getAssignedTo().getId().equals(user.getId()))) {
                        throw new AccessDeniedException("Only the assigned technician can resume this job.");
                    }
                    return;
                }
                break;

            case COMPLETED:
                if (to == WorkOrderStatus.CLOSED) {
                    // Sign-off: Managers only (Section 3.1 & 7.2)
                    if (role != Role.MANAGER) {
                        throw new AccessDeniedException("Only Managers can close and sign-off completed work orders.");
                    }
                    return;
                }
                if (to == WorkOrderStatus.IN_PROGRESS) {
                    // Reopen job: Manager only
                    if (role != Role.MANAGER) {
                        throw new AccessDeniedException("Only Managers can reopen completed work orders.");
                    }
                    return;
                }
                break;

            default:
                break;
        }

        // Any jump not matched above is strictly rejected
        throw new IllegalStateException("Illegal state transition from " + from + " to " + to + ".");
    }

    private void enforceReadAccess(WorkOrder workOrder, UserAuth currentUser) {
        if (currentUser.getRole() == Role.CUSTOMER) {
            if (!workOrder.getCustomer().getEmail().equalsIgnoreCase(currentUser.getUserEmail())) {
                throw new AccessDeniedException("Customers can only view work orders belonging to their organization.");
            }
        } else if (currentUser.getRole() == Role.TECHNICIAN) {
            if (workOrder.getAssignedTo() == null || !workOrder.getAssignedTo().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Technicians can only view work orders assigned to them.");
            }
        }
    }

    private void enforceTechnicianAssignment(WorkOrder workOrder, UserAuth currentUser) {
        if (currentUser.getRole() == Role.TECHNICIAN
                && (workOrder.getAssignedTo() == null
                    || !workOrder.getAssignedTo().getId().equals(currentUser.getId()))) {
            throw new AccessDeniedException("Technicians can only update work orders assigned to them.");
        }
    }

    private String generateUniqueWorkOrderCode() {
        return String.format("WO-%04d", workOrderRepo.nextWorkOrderCodeValue());
    }

    private WorkOrderResponseDTO mapToDTO(WorkOrder w) {
        List<WorkOrderStatusHistoryDTO> historyDTOs = historyRepo.findByWorkOrderIdOrderByChangedAtAsc(w.getId())
                .stream()
                .map(h -> WorkOrderStatusHistoryDTO.builder()
                        .id(h.getId())
                        .fromStatus(h.getFromStatus())
                        .toStatus(h.getToStatus())
                        .changedByEmail(h.getChangedBy() != null ? h.getChangedBy().getUserEmail() : "SYSTEM")
                        .changedByName(h.getChangedBy() != null ? h.getChangedBy().getUserName() : "SYSTEM")
                        .changedAt(h.getChangedAt())
                        .notes(h.getNotes())
                        .build())
                .collect(Collectors.toList());

        List<PartUsageDTO> partsDTOs = partUsageRepo.findByWorkOrderIdOrderByUsedAtAsc(w.getId())
                .stream()
                .map(p -> PartUsageDTO.builder()
                        .id(p.getId())
                        .partId(p.getPart().getId())
                        .partName(p.getPart().getName())
                        .sku(p.getPart().getSku())
                        .quantityUsed(p.getQuantityUsed())
                        .unitCost(p.getUnitCost())
                        .totalCost(p.getTotalCost())
                        .usedByName(p.getUsedBy() != null ? p.getUsedBy().getUserName() : "Unknown")
                        .usedAt(p.getUsedAt())
                        .build())
                .collect(Collectors.toList());

        List<TimeLogDTO> timeDTOs = timeLogRepo.findByWorkOrderIdOrderByLoggedAtAsc(w.getId())
                .stream()
                .map(t -> TimeLogDTO.builder()
                        .id(t.getId())
                        .technicianId(t.getTechnician() != null ? t.getTechnician().getId() : null)
                        .technicianName(t.getTechnician() != null ? t.getTechnician().getUserName() : "Unknown")
                        .technicianEmail(t.getTechnician() != null ? t.getTechnician().getUserEmail() : "Unknown")
                        .minutes(t.getMinutes())
                        .note(t.getNote())
                        .loggedAt(t.getLoggedAt())
                        .build())
                .collect(Collectors.toList());

        return WorkOrderResponseDTO.builder()
                .id(w.getId())
                .code(w.getCode())
                .title(w.getTitle())
                .description(w.getDescription())
                .priority(w.getPriority())
                .status(w.getStatus())
                .slaDueDate(w.getSlaDueDate())
                .slaBreached(w.isSlaBreached())
                .slaAtRisk(w.isSlaAtRisk())
                .customerId(w.getCustomer().getId())
                .customerName(w.getCustomer().getCompanyName())
                .customerEmail(w.getCustomer().getEmail())
                .siteId(w.getSite().getId())
                .siteName(w.getSite().getSiteName())
                .siteAddress(w.getSite().getAddress())
                .assignedToId(w.getAssignedTo() != null ? w.getAssignedTo().getId() : null)
                .assignedToName(w.getAssignedTo() != null ? w.getAssignedTo().getUserName() : null)
                .assignedToEmail(w.getAssignedTo() != null ? w.getAssignedTo().getUserEmail() : null)
                .totalPartsCost(w.getTotalPartsCost())
                .totalLaborMinutes(w.getTotalLaborMinutes())
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .completedAt(w.getCompletedAt())
                .closedAt(w.getClosedAt())
                .statusHistory(historyDTOs)
                .partsUsed(partsDTOs)
                .timeLogs(timeDTOs)
                .build();
    }
}
