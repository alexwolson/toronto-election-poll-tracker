/**
 * Site-wide announcement above the masthead (the design system's Banner, with
 * no link and no dismiss). Temporary editorial copy: shown while the forecast
 * still rests on polls from before Chris Alexander's campaign was suspended on
 * October 6, and removed when the model update ships.
 */
export function SiteNotice() {
  return (
    <div className="banner site-notice" role="region" aria-label="Announcement">
      <div className="wrap banner__inner">
        <p className="banner__text">
          Chris Alexander ended his campaign on Oct. 6. This forecast uses polls taken while he was still campaigning. We
          are working to update our model.
        </p>
      </div>
    </div>
  );
}
