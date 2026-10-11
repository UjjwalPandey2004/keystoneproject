package com.keystone.deliveryservice.ENUM;

import java.util.EnumSet;
import java.util.Set;

/**
 * Recruitment pipeline. INTERVIEW_SCHEDULED is set by scheduling an interview, not by hand,
 * and HIRED is only reachable from SELECTED. REJECTED and HIRED are final.
 */
public enum ApplicationStatus {
    APPLIED,
    UNDER_REVIEW,
    SHORTLISTED,
    INTERVIEW_SCHEDULED,
    SELECTED,
    REJECTED,
    HIRED;

    public boolean isFinal() {
        return this == REJECTED || this == HIRED;
    }

    /** Statuses HR may move to by hand from this one. */
    public Set<ApplicationStatus> manualNext() {
        return switch (this) {
            case APPLIED -> EnumSet.of(UNDER_REVIEW, SHORTLISTED, REJECTED);
            case UNDER_REVIEW -> EnumSet.of(SHORTLISTED, REJECTED);
            case SHORTLISTED -> EnumSet.of(UNDER_REVIEW, SELECTED, REJECTED);
            case INTERVIEW_SCHEDULED -> EnumSet.of(SELECTED, REJECTED);
            case SELECTED -> EnumSet.of(HIRED, REJECTED);
            case REJECTED, HIRED -> EnumSet.noneOf(ApplicationStatus.class);
        };
    }
}
