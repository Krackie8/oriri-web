# Can a Member link a real Instagram profile in 2026?

Ticket: #57 · Researched 2026-11-15

## Answer
**There is no Meta API that lets a *personal* Instagram account prove ownership to a third-party app.** Only Business/Creator ("professional") accounts can do it, through OAuth with Instagram Login. Verified linking isn't worth building for v1. After v1, let a Member type in her @handle as an unverified, self-declared field. If proof turns out to matter, use a manual bio-code check.

## Findings
1. **Basic Display API, the only personal-account OAuth, is gone.** Meta announced on 2024-09-04 that from 2024-12-04 "Instagram Basic Display API will no longer be available." It sends developers to the Instagram API with Instagram Login or with Facebook Login, both for business and creator use cases. Source: https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api/
2. **Instagram API with Instagram Login is for professional accounts only.** The overview describes it as serving Instagram professional accounts ("business or creator"), and personal accounts are not supported. It no longer needs a linked Facebook Page. Source: https://developers.facebook.com/docs/instagram-platform/overview
3. **What the professional flow needs:**
   - The `instagram_business_basic` permission, which returns the user ID and username.
   - Standard Access, which covers only accounts with a role on the app.
   - To serve the public, **Advanced Access**, which requires **App Review and Business Verification**.

   Source: same overview page.
4. **This flow forces a choice.** A Member with a personal account would have to switch her account to Creator or Business first. That changes her public profile, so it is a bad request to make in a women's wellness community.
5. **Lighter proofs:**
   - *Bio code* (she puts a one-time code in her bio, and we check it). Automatically reading her public profile is scraping. Instagram's Terms of Use forbid collecting information in an automated way without Meta's permission (https://help.instagram.com/581066165581870, Terms of Use > "What you can't do"; I couldn't fetch the page to quote it, so check the wording). An admin who looks at the profile by hand is fine.
   - *DM challenge* (she DMs a code to an Oriri account). Reading those DMs through an API needs `instagram_business_manage_messages` on an Oriri professional account, plus Advanced Access and App Review (same overview page). Reading them manually in the Instagram app is fine.

## Recommendation
- **v1:** an optional `instagram_handle` text field, shown as unverified.
- **After v1:** only if trust or safety problems show up, add an admin-run manual check of a bio code. Don't build Meta OAuth unless Oriri targets creator or business Members, such as practitioners or Hosts. For them, Instagram Login with `instagram_business_basic` is the way in, and it needs App Review plus Business Verification.
