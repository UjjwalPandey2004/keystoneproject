package com.keystone.deliveryservice.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.Attendance;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByUserIdAndWorkDate(Long userId, LocalDate workDate);

    List<Attendance> findByWorkDate(LocalDate workDate);

    List<Attendance> findByUserIdAndWorkDateBetweenOrderByWorkDateDesc(Long userId, LocalDate from, LocalDate to);
}
