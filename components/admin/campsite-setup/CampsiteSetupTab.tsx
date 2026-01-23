"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CampsiteCategoriesTab } from "./CampsiteCategoriesTab";
import { CampsiteFeaturesTab } from "./CampsiteFeaturesTab";
import { useTranslations } from "next-intl";

export function CampsiteSetupTab() {
  const [activeTab, setActiveTab] = useState("categories");
  const t = useTranslations('admin.setupCommon.campsite');

  return (
    <Card className="border-0 shadow-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b bg-gray-50/50">
          <TabsList className="h-auto p-0 bg-transparent w-full justify-start rounded-none border-0">
            <TabsTrigger
              value="categories"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              {t('categoriesTab')}
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              {t('featuresTab')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="categories" className="mt-0 p-6">
          <CampsiteCategoriesTab />
        </TabsContent>

        <TabsContent value="features" className="mt-0 p-6">
          <CampsiteFeaturesTab />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
