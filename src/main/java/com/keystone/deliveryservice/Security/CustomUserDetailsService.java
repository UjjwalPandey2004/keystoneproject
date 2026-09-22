package com.keystone.deliveryservice.Security;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.ENUM.Permissions;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserAuthRepository userRepo;

    @Override
    public UserDetails loadUserByUsername(String userEmail) throws UsernameNotFoundException {
        UserAuth user = userRepo.findByUserEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userEmail));

        List<GrantedAuthority> authorities = new ArrayList<>();
        if (user.getRole() != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

            Set<Permissions> perms = RoleBasedPermissions.getRoleBasedPermissions().get(user.getRole());
            if (perms != null) {
                for (Permissions perm : perms) {
                    authorities.add(new SimpleGrantedAuthority(perm.name()));
                }
            }
        }

        return new User(
                user.getUserEmail(),
                user.getPassword(),
                authorities
        );
    }

    // Backward compatibility helper
    public UserDetails loaduserByUserEmail(String userEmail) {
        return loadUserByUsername(userEmail);
    }
}
