import React from "react";
import { Button } from "@heroui/react";
import { MessageCircle } from "lucide-react";

export default function DiscordCTA() {
  return (
    <section className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Visual */}
          <div className="relative">
            {/* Discord-style interface mockup */}
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-2xl overflow-hidden backdrop-blur-sm">
              {/* Header */}
              <div className="bg-slate-900/70 px-6 py-4 border-b border-purple-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm"># general</div>
                    <div className="text-white/60 text-xs">Girl Generator Community</div>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="p-6 space-y-4 h-64">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">A</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">Artist_Mike</span>
                      <span className="text-white/40 text-xs">Today at 2:34 PM</span>
                    </div>
                    <p className="text-white/80 text-sm">Just generated my first character! This AI is incredible 🔥</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">Sarah_Creative</span>
                      <span className="text-white/40 text-xs">Today at 2:35 PM</span>
                    </div>
                    <p className="text-white/80 text-sm">Welcome to the community! Share your creation in #showcase 🎨</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">J</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">Jenny_Designer</span>
                      <span className="text-white/40 text-xs">Today at 2:36 PM</span>
                    </div>
                    <p className="text-white/80 text-sm">The quality improvements in the latest model are amazing!</p>
                  </div>
                </div>
              </div>
              
              {/* Input */}
              <div className="px-6 py-4 border-t border-purple-500/10">
                <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                  <span className="text-white/40 text-sm">Message #general</span>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <div className="absolute -top-4 -right-4 bg-purple-600 text-white rounded-lg px-3 py-2 text-sm font-medium">
              #3 Discord Server in the World
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-green-500 text-white rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              18,542 online
            </div>
          </div>

          {/* Right - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30">
                <span className="text-purple-300 text-sm font-medium">#3 Discord Server in the World</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                <span className="text-white">Be part of a </span>
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  creative
                </span>
                <br />
                <span className="text-white">community! 🌎</span>
              </h2>
              
              <p className="text-xl text-white/70 leading-relaxed">
                Join over 4 million creators sharing techniques, getting feedback, and pushing the boundaries of AI-generated art together.
              </p>
            </div>

            <div className="space-y-4">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-6 text-lg"
                radius="sm"
                startContent={<MessageCircle size={20} />}
              >
                Join Discord Server
              </Button>
              
              <div className="flex items-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span>Active 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-400 rounded-full" />
                  <span>All skill levels</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}