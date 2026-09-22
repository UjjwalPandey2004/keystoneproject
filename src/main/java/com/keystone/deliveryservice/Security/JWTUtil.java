//package com.keystone.deliveryservice.Security;
//
//import java.security.Key;
//import java.util.Date;
//import java.util.HashMap;
//import java.util.Map;
//import java.util.Set;
//
//import org.springframework.stereotype.Component;
//
//import com.keystone.deliveryservice.ENUM.Permissions;
//import com.keystone.deliveryservice.Entity.UserAuth;
//
//import io.jsonwebtoken.Claims;
//import io.jsonwebtoken.JwtException;
//import io.jsonwebtoken.Jwts;
//import io.jsonwebtoken.SignatureAlgorithm;
//import io.jsonwebtoken.security.Keys;
//
//@Component
//
//public class JWTUtil {
// 
//	private final Key key;
//	private final long Validate_Time = 12*60*60*1000L;
//	
//	public JWTUtil () { 
//		String secret = System.getenv("JWT_SECRET");
//		
//		if(secret == null || secret.isEmpty()) {
//			secret = "replace the place using the some secret key";
//			
//		}
//		
//		key =Keys.hmacShaKeyFor(secret.getBytes());
//	}
//	public String generateToken(UserAuth user) {
//		
//	 Map<String,Object>claims = new HashMap<>();
//	 claims.put("Role" ,user.getRole().name());
//	 
//	 Set<Permissions>perm= RoleBasedPermissions.getRoleBasedPermissions().get(user.getRole());
//	 
//	 Date now = new Date();
//	 Date expire= new Date(now.getTime()+Validate_Time);
//	 
//	 return Jwts.builder()
//			  .setClaims(claims)
//			  .setSubject(user.getUserEmail())
//			  .setIssuedAt(now)
//			  .setExpiration(expire)
//			  .signWith(key, SignatureAlgorithm.HS256)
//	          .compact();
//	 
//	}
//	public boolean ValidateToken(String token){
//		try { 
//			
//			Jwts.parserBuilder()
//			.setSigningKey(key)
//			.build().
//			parseClaimsJws(token);
//			return true;
//			
//		} catch (JwtException e) {
//			return false; 
//			  
//		}
//	}
//	public Claims getclaims(String token) {
//	  return Jwts.parserBuilder()
//		    	 .setSigningKey(key)
//		 	     .build()
//			     .parseClaimsJws(token)
//			     .getBody();
//	}
//	
//	public String getUserEmail(String token) {
//	    return getclaim(token)
//	    		.getSubject();
//	}
//}


package com.keystone.deliveryservice.Security;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.keystone.deliveryservice.ENUM.Permissions;
import com.keystone.deliveryservice.Entity.UserAuth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JWTUtil {

    private final Key key;

    // Token validity: 12 hours
    private static final long VALIDATE_TIME = 12 * 60 * 60 * 1000L;

    public JWTUtil() {

        String secret = System.getenv("JWT_SECRET");

        if (secret == null || secret.isEmpty()) {
            // Must be at least 32 characters for HS256
            secret = "MySuperSecretJwtKeyForDeliveryService123456";
        }

        key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    // Generate JWT Token
    public String generateToken(UserAuth user) {

        Map<String, Object> claims = new HashMap<>();

        claims.put("role", user.getRole().name());

        Set<Permissions> permissions =
                RoleBasedPermissions.getRoleBasedPermissions()
                        .get(user.getRole());

        claims.put("permissions", permissions);

        Date now = new Date();
        Date expire = new Date(now.getTime() + VALIDATE_TIME);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(user.getUserEmail())
                .setIssuedAt(now)
                .setExpiration(expire)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // Validate JWT Token
    public boolean validateToken(String token) {

        try {

            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);

            return true;

        } catch (JwtException | IllegalArgumentException e) {

            return false;
        }
    }

    // Get all claims from token
    public Claims getClaim(String token) {

        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // Extract user email
    public String getUserEmail(String token) {

        return getClaim(token).getSubject();
    }

    public String extractToken(String header) {
        if (header != null && header.toLowerCase().startsWith("bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }
    
    // Extract user role
    public String getRole(String token) {

        return getClaim(token).get("role", String.class);
    }

    // Extract expiration date
    public Date getExpiration(String token) {

        return getClaim(token).getExpiration();
    }

    // Check whether token is expired
    public boolean isTokenExpired(String token) {

        return getExpiration(token).before(new Date());
    }
}