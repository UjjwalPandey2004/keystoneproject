package com.keystone.deliveryservice.Repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.ENUM.InterviewStatus;
import com.keystone.deliveryservice.Entity.Interview;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, Long> {

    List<Interview> findByApplicationIdOrderByScheduledAtDesc(Long applicationId);

    List<Interview> findAllByOrderByScheduledAtAsc();

    boolean existsByApplicationIdAndStatus(Long applicationId, InterviewStatus status);

    long countByStatusAndScheduledAtAfter(InterviewStatus status, LocalDateTime after);
}
