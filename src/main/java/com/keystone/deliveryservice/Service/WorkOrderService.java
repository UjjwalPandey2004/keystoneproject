package com.keystone.deliveryservice.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.keystone.deliveryservice.DTO.AssignWorkOrderDTO;
import com.keystone.deliveryservice.DTO.CreateWorkOrderDTO;
import com.keystone.deliveryservice.DTO.LogPartsDTO;
import com.keystone.deliveryservice.DTO.LogTimeDTO;
import com.keystone.deliveryservice.DTO.PartUsageDTO;
import com.keystone.deliveryservice.DTO.TimeLogDTO;
import com.keystone.deliveryservice.DTO.TransitionStatusDTO;
import com.keystone.deliveryservice.DTO.UpdateWorkOrderDTO;
import com.keystone.deliveryservice.DTO.WorkOrderResponseDTO;
import com.keystone.deliveryservice.ENUM.WorkOrderStatus;
import com.keystone.deliveryservice.Entity.UserAuth;

public interface WorkOrderService {

    WorkOrderResponseDTO createWorkOrder(CreateWorkOrderDTO dto, UserAuth currentUser);

    WorkOrderResponseDTO getWorkOrderById(Long id, UserAuth currentUser);

    WorkOrderResponseDTO getWorkOrderByCode(String code, UserAuth currentUser);

    Page<WorkOrderResponseDTO> getWorkOrders(WorkOrderStatus status, Long customerId, Pageable pageable, UserAuth currentUser);

    WorkOrderResponseDTO updateWorkOrder(Long id, UpdateWorkOrderDTO dto, UserAuth currentUser);

    WorkOrderResponseDTO assignWorkOrder(Long id, AssignWorkOrderDTO dto, UserAuth currentUser);

    WorkOrderResponseDTO transitionStatus(Long id, TransitionStatusDTO dto, UserAuth currentUser);

    PartUsageDTO logParts(Long id, LogPartsDTO dto, UserAuth currentUser);

    TimeLogDTO logTime(Long id, LogTimeDTO dto, UserAuth currentUser);
}
