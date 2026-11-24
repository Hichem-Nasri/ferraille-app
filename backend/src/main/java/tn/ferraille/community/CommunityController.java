package tn.ferraille.community;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.PageResponse;
import tn.ferraille.community.CommunityDtos.CasseCard;
import tn.ferraille.community.CommunityDtos.PartRequestCreate;
import tn.ferraille.community.CommunityDtos.PartRequestView;
import tn.ferraille.community.CommunityDtos.ReviewCreate;
import tn.ferraille.community.CommunityDtos.ReviewView;
import tn.ferraille.community.CommunityDtos.SavedSearchCreate;
import tn.ferraille.community.CommunityDtos.SavedSearchView;
import tn.ferraille.community.CommunityDtos.SellerProfile;
import tn.ferraille.security.AuthenticatedUser;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService service;
    private final VehicleIndex vehicleIndex;

    @GetMapping("/requests")
    public PageResponse<PartRequestView> requests(@AuthenticationPrincipal AuthenticatedUser user,
                                                  @RequestParam(required = false) String make,
                                                  @RequestParam(required = false) String model,
                                                  @RequestParam(required = false) String city,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "20") int size) {
        return service.openRequests(make, model, city, user == null ? null : user.id(),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }

    @GetMapping("/requests/for-me")
    public List<PartRequestView> forMe(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.requestsForSeller(user.id());
    }

    @GetMapping("/requests/mine")
    public PageResponse<PartRequestView> mine(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.myRequests(user.id());
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public PartRequestView create(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody PartRequestCreate body) {
        return service.createRequest(user.id(), body);
    }

    @PostMapping("/requests/{id}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void close(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        service.closeRequest(user.id(), "ADMIN".equals(user.role()), id);
    }

    @GetMapping("/sellers/{id}")
    public SellerProfile seller(@PathVariable Long id) {
        return service.sellerProfile(id);
    }

    @GetMapping("/sellers/{id}/reviews")
    public List<ReviewView> reviews(@PathVariable Long id) {
        return service.reviews(id);
    }

    @PostMapping("/sellers/{id}/reviews")
    public ReviewView review(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id,
                             @Valid @RequestBody ReviewCreate body) {
        return service.review(user.id(), id, body);
    }

    @GetMapping("/vehicles")
    public List<VehicleIndex.VehicleEntry> vehicles() {
        return vehicleIndex.all();
    }

    @GetMapping("/casses")
    public List<CasseCard> casses(@RequestParam(required = false) String city) {
        return service.casses(city);
    }

    @GetMapping("/alerts")
    public List<SavedSearchView> alerts(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.savedSearches(user.id());
    }

    @GetMapping("/alerts/count")
    public Map<String, Long> alertsCount(@AuthenticationPrincipal AuthenticatedUser user) {
        return Map.of("newListings", service.totalNew(user.id()),
                "matchingRequests", (long) service.requestsForSeller(user.id()).size());
    }

    @PostMapping("/alerts")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedSearchView createAlert(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody SavedSearchCreate body) {
        return service.saveSearch(user.id(), body);
    }

    @PostMapping("/alerts/{id}/seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void seen(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        service.markSeen(user.id(), id);
    }

    @DeleteMapping("/alerts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        service.deleteSearch(user.id(), id);
    }
}
