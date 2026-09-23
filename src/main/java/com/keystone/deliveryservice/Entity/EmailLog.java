package com.keystone.deliveryservice.Entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name="email_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLog {

	@Id
	@GeneratedValue (strategy=GenerationType.IDENTITY)
	private Long id;

	
	private String recipientEmail;
	private String ccEmail;
	private String subject;
	@Column (length=5000)
	private String body;
	private boolean sentStatus;
	private LocalDateTime sentAt= LocalDateTime.now();
	
	
	public EmailLog(String recipientEmail, String subject, String body, boolean sendStatus) {
		this.recipientEmail=recipientEmail;
		this.subject=subject;
		this.body=body;
		this.sentStatus=sendStatus;
		
	}
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public String getRecipientEmail() {
		return recipientEmail;
	}
	public void setRecipientEmail(String recipientEmail) {
		this.recipientEmail = recipientEmail;
	}
	public String getSubject() {
		return subject;
	}
	public void setSubject(String subject) {
		this.subject = subject;
	}
	public String getBody() {
		return body;
	}
	public void setBody(String body) {
		this.body = body;
	}
	public boolean isSentStatus() {
		return sentStatus;
	}
	public void setSentStatus(boolean sentStatus) {
		this.sentStatus = sentStatus;
	}
	public LocalDateTime getSentAt() {
		return sentAt;
	}
	public void setSentAt(LocalDateTime sentAt) {
		this.sentAt = sentAt;
	}
	public String getCcEmail() {
		return ccEmail;
	}
	public void setCcEmail(String ccEmail) {
		this.ccEmail = ccEmail;
	}
	
	
}
