package com.keystone.deliveryservice.controller;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.CreatePaymentDTO;
import com.keystone.deliveryservice.DTO.PaymentConfigDTO;
import com.keystone.deliveryservice.DTO.PaymentReferenceDTO;
import com.keystone.deliveryservice.DTO.PaymentResponseDTO;
import com.keystone.deliveryservice.DTO.RejectPaymentDTO;
import com.keystone.deliveryservice.Entity.Payment;
import com.keystone.deliveryservice.Service.PaymentService;
import com.keystone.deliveryservice.Service.ReceiptPdfService;
import com.keystone.deliveryservice.Service.ResourceAuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Payments", description = "Customers pay (cash / UPI / UPI QR / card); managers view and confirm; PDF receipts")
public class PaymentController {

    private final PaymentService paymentService;
    private final ReceiptPdfService receiptPdfService;
    private final ResourceAuthorizationService authorizationService;

    public PaymentController(PaymentService paymentService, ReceiptPdfService receiptPdfService,
            ResourceAuthorizationService authorizationService) {
        this.paymentService = paymentService;
        this.receiptPdfService = receiptPdfService;
        this.authorizationService = authorizationService;
    }

    @Operation(summary = "Payment settings for the payment screen (is UPI set up, payee UPI ID)")
    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('MANAGER', 'CUSTOMER')")
    public PaymentConfigDTO config() {
        return paymentService.config();
    }

    @Operation(summary = "List payments: all for managers, own organisation's for customers")
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'CUSTOMER')")
    public List<PaymentResponseDTO> list(Authentication authentication) {
        return paymentService.list(authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Get one payment (manager, or the customer it belongs to)")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'CUSTOMER')")
    public PaymentResponseDTO get(@PathVariable Long id, Authentication authentication) {
        return paymentService.get(id, authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Pay for one of your work orders (Customer only). It stays PENDING until a manager confirms it.")
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<PaymentResponseDTO> create(@Valid @RequestBody CreatePaymentDTO request,
            Authentication authentication) {
        return new ResponseEntity<>(paymentService.create(request, authorizationService.currentUser(authentication)),
                HttpStatus.CREATED);
    }

    @Operation(summary = "Add the UPI transaction reference (UTR) or card slip number after paying (Customer)")
    @PostMapping("/{id}/reference")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponseDTO submitReference(@PathVariable Long id, @Valid @RequestBody PaymentReferenceDTO request,
            Authentication authentication) {
        return paymentService.submitTransactionRef(id, request.getTransactionRef(),
                authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Cancel a pending payment (Customer)")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponseDTO cancel(@PathVariable Long id, Authentication authentication) {
        return paymentService.cancel(id, authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Confirm the customer's money arrived (Manager)")
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasRole('MANAGER')")
    public PaymentResponseDTO confirm(@PathVariable Long id, Authentication authentication) {
        return paymentService.confirm(id, authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Mark a payment as failed, with a reason (Manager)")
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('MANAGER')")
    public PaymentResponseDTO reject(@PathVariable Long id, @Valid @RequestBody RejectPaymentDTO request,
            Authentication authentication) {
        return paymentService.reject(id, request.getReason(), authorizationService.currentUser(authentication));
    }

    @Operation(summary = "Download the PDF receipt of a confirmed payment")
    @GetMapping("/{id}/receipt")
    @PreAuthorize("hasAnyRole('MANAGER', 'CUSTOMER')")
    public ResponseEntity<byte[]> receipt(@PathVariable Long id, Authentication authentication) {
        Payment payment = paymentService.paidPaymentForReceipt(id, authorizationService.currentUser(authentication));
        byte[] pdf = receiptPdfService.render(payment);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("KEYSTONE-Receipt-" + payment.getReference() + ".pdf").build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(pdf);
    }
}
