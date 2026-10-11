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
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Append-only audit trail of an application: status changes, interviews, notes and hiring. */
@Entity
@Table(name = "application_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private JobApplication application;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private ApplicationStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 30)
    private ApplicationStatus toStatus;

    // e.g. "Interview scheduled for 14 Oct 2026, 11:00".
    @Column(nullable = false, length = 500)
    private String action;

    // Null when the candidate applied through the public careers page.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "changed_by_id")
    private UserAuth changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;
}
