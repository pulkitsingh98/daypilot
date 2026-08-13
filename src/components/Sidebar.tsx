import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { navItems } from '../nav'
import { useTodayStreak } from '../lib/useTodayStreak'
import { useOnboardingSteps } from '../lib/useOnboardingSteps'
import { dismissOnboardingBanner, isOnboardingBannerDismissed } from '../lib/onboardingBanner'
import StreakSummary from './StreakSummary'
import AppLogo from './AppLogo'
import OnboardingChecklist from './today/OnboardingChecklist'

export default function Sidebar() {
  const streak = useTodayStreak()
  const onboarding = useOnboardingSteps()
  const [bannerDismissed, setBannerDismissed] = useState(() => isOnboardingBannerDismissed())
  const showOnboardingChecklist = !onboarding.loading && !onboarding.allDone && !bannerDismissed

  function dismissBanner() {
    dismissOnboardingBanner()
    setBannerDismissed(true)
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:overflow-y-auto md:border-r md:border-mist-line md:bg-paper-raised md:px-3 md:py-6">
      <div className="mb-6 flex items-center gap-2 px-3">
        <AppLogo size="sm" />
        <span className="font-display text-lg font-semibold text-dusk-deep">DayPilot</span>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-dusk text-paper-raised'
                  : 'text-ink-soft hover:bg-haze hover:text-ink'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {showOnboardingChecklist && (
        <div className="mt-4 px-1">
          <OnboardingChecklist onDismiss={dismissBanner} />
        </div>
      )}

      <div className="mt-4 px-1">
        <StreakSummary {...streak} />
      </div>
    </aside>
  )
}
