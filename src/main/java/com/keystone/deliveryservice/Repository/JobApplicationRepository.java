package com.keystone.deliveryservice.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.ENUM.ApplicationStatus;
import com.keystone.deliveryservice.Entity.JobApplication;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findAllByOrderByCreatedAtDesc();

    List<JobApplication> findByJobOpeningIdOrderByCreatedAtDesc(Long jobOpeningId);

    long countByStatus(ApplicationStatus status);

    long countByJobOpeningId(Long jobOpeningId);

    boolean existsByJobOpeningIdAndEmailIgnoreCase(Long jobOpeningId, String email);

    @Query(value = "SELECT nextval('job_application_reference_seq')", nativeQuery = true)
    Long nextReferenceValue();
}
