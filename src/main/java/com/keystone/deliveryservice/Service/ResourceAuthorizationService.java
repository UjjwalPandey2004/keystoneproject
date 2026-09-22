package com.keystone.deliveryservice.Service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.ENUM.Role;
import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

@Service
public class ResourceAuthorizationService {

    private final UserAuthRepository userRepository;

    public ResourceAuthorizationService(UserAuthRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserAuth currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }

        return userRepository.findByUserEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user profile was not found"));
    }

    public void requireCustomerAccess(Customer customer, Authentication authentication) {
        UserAuth user = currentUser(authentication);
        if (user.getRole() == Role.CUSTOMER
                && !customer.getEmail().equalsIgnoreCase(user.getUserEmail())) {
            throw new AccessDeniedException("Customers can only access their own organization");
        }
    }

    public void requireSiteAccess(Site site, Authentication authentication) {
        UserAuth user = currentUser(authentication);
        if (user.getRole() == Role.CUSTOMER
                && (site.getCustomer() == null
                    || !site.getCustomer().getEmail().equalsIgnoreCase(user.getUserEmail()))) {
            throw new AccessDeniedException("Customers can only access sites belonging to their organization");
        }
    }
}
