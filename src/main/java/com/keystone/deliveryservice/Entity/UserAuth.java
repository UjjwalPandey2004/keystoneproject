package com.keystone.deliveryservice.Entity;

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
	private String UserName;
	
	@Column(unique=true,nullable=false)
	private String UserEmail;
	
	@Column(nullable=false)
	private String password;
	
	private String phone;
	
	@Enumerated(EnumType.STRING)
	private Role role;


	private String resettoken;
	private Date tokenExpireTime;
	
	
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
		return UserName;
	}

	public void setUserName(String userName) {
		UserName = userName;
	}

	public String getUserEmail() {
		return UserEmail;
	}

	public void setUserEmail(String userEmail) {
		UserEmail = userEmail;
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
 