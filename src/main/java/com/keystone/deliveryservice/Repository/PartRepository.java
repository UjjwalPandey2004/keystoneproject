package com.keystone.deliveryservice.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.Part;

import jakarta.persistence.LockModeType;

@Repository
public interface PartRepository extends JpaRepository<Part, Long> {

    Optional<Part> findBySku(String sku);

    boolean existsBySku(String sku);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Part p where p.id = :id")
    Optional<Part> findByIdForUpdate(@Param("id") Long id);
}
