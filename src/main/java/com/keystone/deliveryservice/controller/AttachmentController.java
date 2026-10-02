package com.keystone.deliveryservice.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.keystone.deliveryservice.DTO.AttachmentDTO;
import com.keystone.deliveryservice.Service.AttachmentService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/work-orders/{workOrderId}/attachments")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Work Order Attachments", description = "Photos and documents on a work order (same access as the work order)")
public class AttachmentController {

    private final AttachmentService attachmentService;
    private final ResourceAuthorizationService authorizationService;

    public AttachmentController(AttachmentService attachmentService, ResourceAuthorizationService authorizationService) {
        this.attachmentService = attachmentService;
        this.authorizationService = authorizationService;
    }

    @Operation(summary = "List the work order's attachments")
    @GetMapping
    public List<AttachmentDTO> list(@PathVariable Long workOrderId, Authentication authentication) {
        return attachmentService.list(workOrderId, authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Upload a photo (JPEG/PNG/WebP) or PDF, up to 10 MB")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentDTO> upload(@PathVariable Long workOrderId, @RequestParam("file") MultipartFile file,
            Authentication authentication) throws IOException {
        return new ResponseEntity<>(attachmentService.upload(workOrderId, file, authorizationService.currentUser(authentication)),
                HttpStatus.CREATED);
    }

    @Operation(summary = "Download an attachment")
    @GetMapping("/{attachmentId}")
    public ResponseEntity<byte[]> download(@PathVariable Long workOrderId, @PathVariable Long attachmentId,
            Authentication authentication) throws IOException {
        AttachmentService.Download file = attachmentService.download(workOrderId, attachmentId,
                authorizationService.currentUser(authentication));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(file.content());
    }
}
