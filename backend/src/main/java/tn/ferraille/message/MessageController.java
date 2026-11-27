package tn.ferraille.message;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.message.MessageService.AdminContacts;
import tn.ferraille.message.MessageService.MessageCreate;
import tn.ferraille.message.MessageService.MessageView;
import tn.ferraille.security.AuthenticatedUser;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService service;

    @PostMapping("/listings/{id:\\d+}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public void send(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id,
                     @Valid @RequestBody MessageCreate body) {
        service.send(id, user == null ? null : user.id(), body);
    }

    @GetMapping("/messages")
    public List<MessageView> inbox(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.inbox(user.id());
    }

    @GetMapping("/messages/unread")
    public Map<String, Long> unread(@AuthenticationPrincipal AuthenticatedUser user) {
        return Map.of("count", service.unread(user.id()));
    }

    @PostMapping("/messages/{id:\\d+}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        service.markRead(user.id(), id, "ADMIN".equals(user.role()));
    }

    @GetMapping("/admin/contacts")
    public AdminContacts adminContacts() {
        return service.adminContacts();
    }
}
