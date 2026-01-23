"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FeatureTemplatesTab } from "./FeatureTemplatesTab";
import { RestrictionTemplatesTab } from "./RestrictionTemplatesTab";
import { GroundTypesTab } from "./GroundTypesTab";
import { useTranslations } from "next-intl";

export function PitchSetupTab() {
  const [activeTab, setActiveTab] = useState("features");
  const t = useTranslations('admin.setupCommonPitch');

  return (
    <Card className="border-0 shadow-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b bg-gray-50/50">
          <TabsList className="h-auto p-0 bg-transparent w-full justify-start rounded-none border-0">
            <TabsTrigger
              value="features"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              {t('featureTemplates')}
            </TabsTrigger>
            <TabsTrigger
              value="restrictions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              {t('restrictionTemplates')}
            </TabsTrigger>
            <TabsTrigger
              value="groundTypes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              {t('groundTypes')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="features" className="mt-0 p-6">
          <FeatureTemplatesTab />
        </TabsContent>

        <TabsContent value="restrictions" className="mt-0 p-6">
          <RestrictionTemplatesTab />
        </TabsContent>

        <TabsContent value="groundTypes" className="mt-0 p-6">
          <GroundTypesTab />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
