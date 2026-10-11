package com.keystone.deliveryservice.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.ENUM.JobStatus;
import com.keystone.deliveryservice.Entity.JobOpening;

@Repository
public interface JobOpeningRepository extends JpaRepository<JobOpening, Long> {

    List<JobOpening> findAllByOrderByCreatedAtDesc();

    List<JobOpening> findByStatusOrderByCreatedAtDesc(JobStatus status);

    long countByStatus(JobStatus status);
}
