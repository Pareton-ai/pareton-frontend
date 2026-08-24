import { NavLink } from "@/components/landing/nav-link";
import { Socials } from "@/components/landing/socials";
import { siteContent } from "@/lib/site-content";

export function Close() {
  const { close } = siteContent;
  return (
    <section className="close" id="contact">
      <div className="wrap">
        <h2>{close.title}</h2>
        <p>{close.body}</p>
        <div className="actions">
          <NavLink className="btn" href={close.primary.href}>
            {close.primary.label}
          </NavLink>
          <NavLink className="text-link" href={close.secondary.href}>
            {close.secondary.label}
          </NavLink>
        </div>
        <Socials />
      </div>
    </section>
  );
}
