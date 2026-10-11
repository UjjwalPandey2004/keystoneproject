package com.keystone.deliveryservice.DTO;

import lombok.Builder;
import lombok.Data;

// Recruitment figures for the HR dashboard, counted from the database.
@Data
@Builder
public class HrStatsDTO {
    private long totalOpenings;
    private long publishedOpenings;
    private long totalApplications;
    private long newApplications;
    private long underReview;
    private long shortlisted;
    private long interviewsScheduled;
    private long upcomingInterviews;
    private long selected;
    private long rejected;
    private long hired;
    // Whether interview emails can actually reach candidates.
    private boolean candidateEmailEnabled;
}
