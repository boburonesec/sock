"use client";

import { useState } from "react";
import { GuideToc, GUIDE_SECTIONS } from "./components/guide-toc";
import { GuideHero } from "./components/guide-hero";
import { GuideOnboardingSteps } from "./components/guide-onboarding-steps";
import { GuideOwnerSection } from "./components/guide-owner-section";
import { GuideRoleMatrix } from "./components/guide-role-matrix";
import { GuideDefaultData } from "./components/guide-default-data";
import { GuideProductionFlow } from "./components/guide-production-flow";
import { GuideWarehouseFlow } from "./components/guide-warehouse-flow";
import { GuideSalesDebtFlow } from "./components/guide-sales-debt-flow";
import { GuideSupplierFlow } from "./components/guide-supplier-flow";
import { GuidePayrollFlow } from "./components/guide-payroll-flow";
import { GuideTestWalkthrough } from "./components/guide-test-walkthrough";

export function GuideModule() {
  const [activeSection, setActiveSection] = useState<string>("about");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Interactive Sticky Table of Contents */}
      <GuideToc activeSection={activeSection} onSelectSection={scrollToSection} />

      {/* 1. Paypoq OS Nima? */}
      <GuideHero />

      {/* 2. Qayerdan Boshlash Kerak? */}
      <GuideOnboardingSteps />

      {/* 3. Owner Uchun Boshqaruv Qo'llanmasi */}
      <GuideOwnerSection />

      {/* 4. Rollar va Ruxsatlar Matritsasi */}
      <GuideRoleMatrix />

      {/* 5. Standart va Sozlanadigan Ma'lumotlar */}
      <GuideDefaultData />

      {/* 6. Ishlab Chiqarish va Stage Inventory */}
      <GuideProductionFlow />

      {/* 7. Ombor va Zonalarda Tovar Harakati */}
      <GuideWarehouseFlow />

      {/* 8. Sotuv, Yetkazib Berish va Mijoz Qarzi */}
      <GuideSalesDebtFlow />

      {/* 9. Xomashyo Xaridi va Ta'minotchi Qarzi */}
      <GuideSupplierFlow />

      {/* 10. Ish Haqi (Payroll) va Ishbay Hisob */}
      <GuidePayrollFlow />

      {/* 11. 10 Qadamli Amaliy Sinov Ssenariysi */}
      <GuideTestWalkthrough />
    </div>
  );
}
