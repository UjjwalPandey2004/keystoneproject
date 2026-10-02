package com.keystone.deliveryservice.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.ENUM.PaymentStatus;
import com.keystone.deliveryservice.Entity.Payment;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findAllByOrderByCreatedAtDesc();

    List<Payment> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    // A customer's own payments: the ones they made themselves.
    List<Payment> findByPayerIdOrderByCreatedAtDesc(Long payerId);

    boolean existsByWorkOrderIdAndStatus(Long workOrderId, PaymentStatus status);

    boolean existsByTransactionRefIgnoreCase(String transactionRef);

    @Query(value = "SELECT nextval('payment_reference_seq')", nativeQuery = true)
    Long nextReferenceValue();
}
