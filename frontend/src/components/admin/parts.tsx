"use client";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminSection({
  id,
  icon: Icon,
  title,
  description,
  badge,
  actions,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="panel admin-section"
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <header className="admin-section-header">
        <span className="admin-section-icon" aria-hidden>
          <Icon size={18} />
        </span>
        <div className="admin-section-heading">
          <div className="admin-section-title">
            <h2 id={`${id}-title`}>{title}</h2>
            {badge && <span className="badge">{badge}</span>}
          </div>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="admin-section-actions">{actions}</div>}
      </header>
      <div className="admin-section-body">{children}</div>
    </section>
  );
}

/** Label and explanation on the left, control on the right; stacks on phones. */
export function SettingRow({
  label,
  htmlFor,
  description,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const descriptionId = htmlFor ? `${htmlFor}-description` : undefined;
  return (
    <div className="setting-row">
      <div className="setting-copy">
        {htmlFor ? (
          <label htmlFor={htmlFor}>{label}</label>
        ) : (
          <span className="setting-label">{label}</span>
        )}
        {description && <p id={descriptionId}>{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

/** Native checkbox styled as a switch, so labels and tests keep working. */
export function Switch({
  id,
  checked,
  disabled,
  onChange,
  describedBy,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  describedBy?: string;
}) {
  return (
    <input
      id={id}
      type="checkbox"
      className="switch"
      checked={checked}
      disabled={disabled}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

/** A labelled switch tile for grids of related on/off options. */
export function SwitchTile({
  id,
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  detail?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className="switch-tile"
      htmlFor={id}
      data-checked={checked}
      data-disabled={disabled}
    >
      <span className="switch-tile-copy">
        <span className="switch-tile-label">{label}</span>
        {detail && <span className="switch-tile-detail">{detail}</span>}
      </span>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  );
}

export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  labelledBy,
}: {
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  labelledBy: string;
}) {
  return (
    <div
      className="admin-segmented"
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      {options.map((option) => (
        <label key={option.value} data-checked={option.value === value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
