package com.keystone.deliveryservice.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.DTO.EmailLogDTO;
import com.keystone.deliveryservice.Entity.EmailLog;
import com.keystone.deliveryservice.Repository.EmailLogRepository;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailLogService {

    @Autowired
    private JavaMailSender javaMailSender;
    
    @Autowired
    private EmailLogRepository emailLogRepo;

    @Value("${notifications.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.base-url:http://localhost:5173}")
    private String appBaseUrl;
    
    public void sendResetPasswordMail(String to, String token) {

        String resetPasswordLink = appBaseUrl + "/reset-password?token=" + token;

        if (!mailEnabled) {
            emailLogRepo.save(new EmailLog(to, "Reset Your Password",
                    "Password reset requested. Email delivery is disabled in this environment.", false));
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(to);
        message.setSubject("Reset Your Password");
        message.setText(
                "Click the link below to reset your password:\n\n"
                        + resetPasswordLink
        );

        javaMailSender.send(message);
    }
    
    public String notification(EmailLogDTO email) {
    	
    	boolean sendStatus=false;
    	
		try {
			if (!mailEnabled) {
				throw new IllegalStateException("Email delivery is disabled");
			}
    		MimeMessage message = javaMailSender.createMimeMessage();
    		
    		MimeMessageHelper helper = new MimeMessageHelper(message,true);
    		
    		helper.setTo(email.RecipientEmail);
    		helper.setSubject(email.subject);
    		helper.setText(email.body);
    		javaMailSender.send(message);
    		
    		sendStatus=true;
    		
    	}catch (Exception e) {
    		sendStatus = false;	
    	}
    	
    	EmailLog emailLog= new EmailLog(email.RecipientEmail,
    			                        email.subject,
    			                        email.body,sendStatus);
    	
    	emailLogRepo.save(emailLog);
  
    	return sendStatus ? "Email sent successfully" : "Email sending failed";
    	
    }
}
