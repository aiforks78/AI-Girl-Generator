"use client";

import React from "react";
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from "@heroui/react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

export default function PriceComparison() {
  const features = [
    {
      name: "Daily Credits",
      free: "6 credits/day",
      member: "800 credits/month",
      highlight: true,
    },
    {
      name: "Resolution Quality",
      free: "720p max",
      member: "1080p & 2K",
      highlight: true,
    },
    {
      name: "Watermark",
      free: "Watermarked",
      member: "No watermarks",
      highlight: true,
    },
    {
      name: "Text-to-Image Models",
      free: "Core starter model only",
      member: "Includes premium and max-tier models",
      highlight: true,
    },
    {
      name: "Image-to-Image Models",
      free: false,
      member: "Includes advanced remix + stylizer models",
      highlight: true,
    },
    {
      name: "Image-to-Video Models",
      free: false,
      member: "Access to fast and pro video generators",
      highlight: true,
    },
    {
      name: "Queue Priority",
      free: "Standard queue",
      member: "Priority queue",
      highlight: false,
    },
    {
      name: "Prompt History",
      free: true,
      member: true,
      highlight: false,
    },
    {
      name: "Commercial License",
      free: false,
      member: true,
      highlight: false,
    },
  ];

  const renderFeatureValue = (value: string | boolean, isMember: boolean = false) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckIcon className="w-5 h-5 text-green-400 mx-auto" />
      ) : (
        <XMarkIcon className="w-5 h-5 text-red-400 mx-auto" />
      );
    }

    return (
      <span className={`text-sm ${isMember ? "font-medium text-[#d946ef]" : "text-white/70"}`}>
        {value}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto mt-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Compare Plans</h2>
        <p className="text-lg text-white/70">
          See exactly what you get with each plan
        </p>
      </div>

      <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
        <CardBody className="p-0">
          <Table
            aria-label="Plan comparison table"
            removeWrapper
            className="min-h-[400px]"
            classNames={{
              th: "bg-white/5 text-white border-b border-white/10",
              td: "text-white border-b border-white/5",
              wrapper: "bg-transparent",
              table: "bg-transparent",
            }}
          >
            <TableHeader>
              <TableColumn className="text-center">Features</TableColumn>
              <TableColumn className="text-center">
                <div>
                  <div className="font-bold text-white">Free Plan</div>
                  <div className="text-sm font-normal text-white/60">$0/month</div>
                </div>
              </TableColumn>
              <TableColumn className="text-center">
                <div>
                  <div className="font-bold text-white">Member Plan</div>
                  <div className="text-sm font-normal text-white/60">$29.90/month</div>
                  <Chip size="sm" color="secondary" variant="flat" className="mt-1 bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white">
                    Most Popular
                  </Chip>
                </div>
              </TableColumn>
            </TableHeader>
            <TableBody>
              {features.map((feature, index) => (
                <TableRow
                  key={index}
                  className={feature.highlight ? "bg-white/5" : ""}
                >
                  <TableCell className="font-medium text-white py-4">
                    {feature.name}
                    {feature.highlight && (
                      <Chip size="sm" variant="flat" color="warning" className="ml-2 bg-yellow-500/20 text-yellow-400">
                        Key Feature
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell className="text-center py-4">
                    {renderFeatureValue(feature.free)}
                  </TableCell>
                  <TableCell className="text-center py-4">
                    {renderFeatureValue(feature.member, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
