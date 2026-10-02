package com.keystone.deliveryservice.Security;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.keystone.deliveryservice.Repository.UserAuthRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JWTAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JWTUtil jwtUtil;

    @Autowired
    private CustomUserDetailsService customUserDetails;

    @Autowired
    private TokenKillingService tokenKill;

    @Autowired
    private UserAuthRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        String token = jwtUtil.extractToken(header);

        if (token != null) {
            if (tokenKill.isblockToken(token)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Token has been invalidated/logged out\"}");
                return;
            }

            if (jwtUtil.validateToken(token) && SecurityContextHolder.getContext().getAuthentication() == null) {
                String userEmail = jwtUtil.getUserEmail(token);

                // A password change or reset signs out every session opened before it.
                if (issuedBeforePasswordChange(token, userEmail)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Your password was changed. Please sign in again.\"}");
                    return;
                }

                UserDetails userDetails = customUserDetails.loadUserByUsername(userEmail);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean issuedBeforePasswordChange(String token, String userEmail) {
        LocalDateTime changedAt = userRepository.findPasswordChangedAt(userEmail).orElse(null);
        if (changedAt == null) {
            return false;
        }
        // JWT "iat" has one-second precision, so compare at whole seconds: a token issued in the
        // same second as the change (the one handed back by change-password) stays valid.
        long changedAtSecond = changedAt.atZone(ZoneId.systemDefault()).toEpochSecond();
        long issuedAtSecond = jwtUtil.getClaim(token).getIssuedAt().toInstant().getEpochSecond();
        return issuedAtSecond < changedAtSecond;
    }
}
