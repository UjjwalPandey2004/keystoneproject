package com.keystone.deliveryservice.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.ENUM.Role;

@Repository
public interface UserAuthRepository extends JpaRepository<UserAuth, Long> {

    Optional<UserAuth> findByUserEmail(String userEmail);

    boolean existsByUserEmail(String userEmail);

    Optional<UserAuth> findByResettoken(String resettoken);

    List<UserAuth> findByRole(Role role);

    List<UserAuth> findByPassword(String password);

    List<UserAuth> findByRoleIn(Collection<Role> roles);

    List<UserAuth> findByCustomerId(Long customerId);

    // Newest accounts first; accounts without a recorded join date come last.
    @Query("SELECT u FROM UserAuth u WHERE u.role = :role ORDER BY u.createdAt DESC NULLS LAST, u.id DESC")
    List<UserAuth> findByRoleNewestFirst(@Param("role") Role role);

    @Query("SELECT u.passwordChangedAt FROM UserAuth u WHERE u.userEmail = :email")
    Optional<LocalDateTime> findPasswordChangedAt(@Param("email") String email);

}
