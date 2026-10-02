package com.keystone.deliveryservice.Service;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.keystone.deliveryservice.DTO.AttachmentDTO;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Entity.WorkOrder;
import com.keystone.deliveryservice.Entity.WorkOrderAttachment;
import com.keystone.deliveryservice.Repository.WorkOrderAttachmentRepository;
import com.keystone.deliveryservice.Repository.WorkOrderRepository;
import com.keystone.deliveryservice.Service.storage.StorageService;

/**
 * Photos and documents on a work order. Anyone who may view the work order may list, download
 * and add files to it; the access rule is the same one the work order itself uses.
 */
@Service
@Transactional
public class AttachmentService {

    static final long MAX_BYTES = 10L * 1024 * 1024;

    private final WorkOrderAttachmentRepository attachmentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderService workOrderService;
    private final StorageService storage;

    public AttachmentService(WorkOrderAttachmentRepository attachmentRepository, WorkOrderRepository workOrderRepository,
            WorkOrderService workOrderService, StorageService storage) {
        this.attachmentRepository = attachmentRepository;
        this.workOrderRepository = workOrderRepository;
        this.workOrderService = workOrderService;
        this.storage = storage;
    }

    public record Download(String fileName, String contentType, byte[] content) {
    }

    @Transactional(readOnly = true)
    public List<AttachmentDTO> list(Long workOrderId, UserAuth user) {
        requireAccess(workOrderId, user);
        return attachmentRepository.findByWorkOrderIdOrderByUploadedAtDesc(workOrderId).stream().map(AttachmentService::toDTO).toList();
    }

    public AttachmentDTO upload(Long workOrderId, MultipartFile file, UserAuth user) throws IOException {
        requireAccess(workOrderId, user);
        WorkOrder workOrder = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new IllegalArgumentException("Work order not found"));
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose a file to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("The file is too large. The limit is 10 MB.");
        }
        byte[] bytes = file.getBytes();
        // Trust the file's actual content, not the name or the browser-supplied type.
        FileKind kind = FileKind.detect(bytes);
        if (kind == null) {
            throw new IllegalArgumentException("Only JPEG, PNG, WebP images and PDF documents can be uploaded.");
        }

        String key = "work-orders/" + workOrderId + "/" + UUID.randomUUID() + kind.extension;
        storage.put(key, bytes);
        WorkOrderAttachment attachment = WorkOrderAttachment.builder()
                .workOrder(workOrder)
                .fileName(cleanFileName(file.getOriginalFilename(), kind))
                .contentType(kind.contentType)
                .sizeBytes((long) bytes.length)
                .storageKey(key)
                .uploadedBy(user)
                .build();
        return toDTO(attachmentRepository.save(attachment));
    }

    @Transactional(readOnly = true)
    public Download download(Long workOrderId, Long attachmentId, UserAuth user) throws IOException {
        requireAccess(workOrderId, user);
        WorkOrderAttachment attachment = attachmentRepository.findByIdAndWorkOrderId(attachmentId, workOrderId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        return new Download(attachment.getFileName(), attachment.getContentType(), storage.get(attachment.getStorageKey()));
    }

    private void requireAccess(Long workOrderId, UserAuth user) {
        // Throws AccessDeniedException exactly when the user may not see this work order.
        workOrderService.getWorkOrderById(workOrderId, user);
    }

    private static String cleanFileName(String original, FileKind kind) {
        String name = original == null ? "" : original.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (name.isEmpty()) {
            name = "attachment";
        }
        if (name.length() > 120) {
            name = name.substring(0, 120);
        }
        return name.toLowerCase().endsWith(kind.extension) ? name : name + kind.extension;
    }

    private static AttachmentDTO toDTO(WorkOrderAttachment a) {
        return AttachmentDTO.builder()
                .id(a.getId())
                .fileName(a.getFileName())
                .contentType(a.getContentType())
                .sizeBytes(a.getSizeBytes())
                .uploadedByName(a.getUploadedBy().getUserName())
                .uploadedAt(a.getUploadedAt())
                .build();
    }

    enum FileKind {
        JPEG("image/jpeg", ".jpg"),
        PNG("image/png", ".png"),
        WEBP("image/webp", ".webp"),
        PDF("application/pdf", ".pdf");

        final String contentType;
        final String extension;

        FileKind(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        static FileKind detect(byte[] b) {
            if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return JPEG;
            if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return PNG;
            if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                    && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return WEBP;
            if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return PDF;
            return null;
        }
    }
}
