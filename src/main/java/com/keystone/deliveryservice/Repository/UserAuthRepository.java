package com.keystone.deliveryservice.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.UserAuth;

@Repository
public interface UserAuthRepository extends JpaRepository<UserAuth, Long> {

    Optional<UserAuth> findByUserEmail(String userEmail);

    boolean existsByUserEmail(String userEmail);

    Optional<UserAuth> findByResettoken(String resettoken);

}
