package com.keystone.deliveryservice.Entity;

import java.time.LocalDateTime;

import com.keystone.deliveryservice.ENUM.ApplicationStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "job_applications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Human-readable reference, e.g. KS-APP-000012.
    @Column(nullable = false, unique = true, length = 30)
    private String reference;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "job_opening_id", nullable = false)
    private JobOpening jobOpening;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 2000)
    private String experience;

    @Column(length = 1000)
    private String skills;

    @Column(length = 1000)
    private String education;

    @Column(name = "cover_letter", length = 4000)
    private String coverLetter;

    // The resume is kept in private storage and only streamed to HR and managers.
    @Column(name = "resume_file_name", nullable = false, length = 255)
    private String resumeFileName;

    @Column(name = "resume_content_type", nullable = false, length = 120)
    private String resumeContentType;

    @Column(name = "resume_size_bytes", nullable = false)
    private Long resumeSizeBytes;

    @Column(name = "resume_storage_key", nullable = false, unique = true, length = 300)
    private String resumeStorageKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApplicationStatus status;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    // HR-only notes; never shown to the candidate.
    @Column(name = "internal_notes", length = 4000)
    private String internalNotes;

    // Employee account created for a hired candidate by HR or a manager.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_user_id")
    private UserAuth employeeAccount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
