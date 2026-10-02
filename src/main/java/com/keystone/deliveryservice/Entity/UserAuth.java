package com.keystone.deliveryservice.Entity;

import java.time.LocalDateTime;
import java.util.Date;

//import org.springframework.beans.factory.annotation.Autowired;


import com.keystone.deliveryservice.ENUM.Role;

import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name="user_auth")

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder

public class UserAuth {
 
	@Id
	@GeneratedValue(strategy=GenerationType.IDENTITY)
	private Long id ;
	
	@Column(nullable=false)
	private String userName;

	
	
	@Column(unique=true,nullable=false)
	private String userEmail;
	
	@Column(nullable=false)
	private String password;
	
	private String phone;
	
	@Enumerated(EnumType.STRING)
	private Role role;


	// Organisation a CUSTOMER user belongs to; null for staff and unlinked accounts.
	@Column(name="customer_id")
	private Long customerId;

	private String resettoken;
	private Date tokenExpireTime;

	// Self-registered accounts must confirm their email with a one-time code before signing in.
	@Builder.Default
	@Column(nullable=false)
	private boolean emailVerified = true;

	// BCrypt hash of the pending one-time code; the code itself is never stored.
	private String otpHash;
	private LocalDateTime otpExpiresAt;
	@Builder.Default
	@Column(nullable=false)
	private int otpAttempts = 0;
	private LocalDateTime otpSentAt;

	// JWTs issued before this moment are no longer accepted.
	private LocalDateTime passwordChangedAt;

	// When the account was created; null for accounts that existed before this was recorded.
	@Column(name="created_at", updatable=false)
	private LocalDateTime createdAt;

	@PrePersist
	protected void onCreate() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	// Technician dispatch details.
	private String location;
	@Builder.Default
	@Column(nullable=false)
	private boolean available = true;

	public boolean isLinkedTo(long organisationId) {
		return customerId != null && customerId == organisationId;
	}

	
//	public UserAuth() {}
//	public UserAuth(Long id,
//			String User,
//			String UserEmail,
//			String phone,
//			Role role) {
	
//	this.id=id;
//	this.UserName=UserName;
//	this.UserEmail=UserEmail;
//	this.password=password;
//	this.phone=phone;
//	this.role=role;
//	
//	}
	
	public String getResettoken() {
		return resettoken;
	}

	public void setResettoken(String resettoken) {
		this.resettoken = resettoken;
	}

	public Date getTokenExpireTime() {
		return tokenExpireTime;
	}

	public void setTokenExpireTime(Date tokenExpireTime) {
		this.tokenExpireTime = tokenExpireTime;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getUserName() {
	    return userName;
	}

	public void setUserName(String userName) {
	    this.userName = userName;
	}

	public String getUserEmail() {
	    return userEmail;
	}

	public void setUserEmail(String userEmail) {
	    this.userEmail = userEmail;
}
	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public Role getRole() {
		return role;
	}
	

	public void setRole(Role role) {
		this.role = role;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}
	
	
}
 