package com.keystone.deliveryservice.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.WorkOrderAttachment;

@Repository
public interface WorkOrderAttachmentRepository extends JpaRepository<WorkOrderAttachment, Long> {

    List<WorkOrderAttachment> findByWorkOrderIdOrderByUploadedAtDesc(Long workOrderId);

    Optional<WorkOrderAttachment> findByIdAndWorkOrderId(Long id, Long workOrderId);
}
