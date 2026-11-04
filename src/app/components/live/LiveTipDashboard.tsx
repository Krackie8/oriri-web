import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  Users, 
  Clock,
  Trophy,
  Gift,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useLiveTip } from '../../contexts/LiveTipContext';
import { motion, AnimatePresence } from 'motion/react';

interface LiveTipDashboardProps {
  sessionId: string;
  isHost?: boolean;
}

export function LiveTipDashboard({ sessionId, isHost = false }: LiveTipDashboardProps) {
  const { 
    tips, 
    goals, 
    getSessionStats, 
    getTopTippers,
    createGoal,
    isCreatingGoal 
  } = useLiveTip();
  
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');

  const stats = getSessionStats(sessionId);
  const topTippers = getTopTippers(sessionId, 5);
  const sessionGoals = goals.filter(goal => goal.sessionId === sessionId);
  const recentTips = tips.filter(tip => tip.sessionId === sessionId).slice(0, 10);

  const handleCreateGoal = async () => {
    if (!newGoalTitle || !newGoalTarget) return;
    
    try {
      await createGoal(sessionId, newGoalTitle, parseInt(newGoalTarget), newGoalDescription);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalDescription('');
      setShowCreateGoal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!stats) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">No Tips Yet</h3>
          <p className="text-sm text-muted-foreground">
            Tips will appear here as they come in during the live session.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-green-500">${stats.totalAmount}</div>
            <div className="text-xs text-muted-foreground">Total Raised</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-blue-500">{stats.totalTips}</div>
            <div className="text-xs text-muted-foreground">Total Tips</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold text-purple-500">${Math.round(stats.averageTip)}</div>
            <div className="text-xs text-muted-foreground">Average Tip</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold text-yellow-500">
              ${stats.topTipper?.amount || 0}
            </div>
            <div className="text-xs text-muted-foreground">Top Tip</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="leaderboard">Top Tippers</TabsTrigger>
          <TabsTrigger value="recent">Recent Tips</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          {isHost && (
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Tip Goals
                  </CardTitle>
                  <Button
                    onClick={() => setShowCreateGoal(!showCreateGoal)}
                    variant="outline"
                    size="sm"
                  >
                    {showCreateGoal ? <ChevronUp className="w-4 h-4" /> : 'Create Goal'}
                  </Button>
                </div>
              </CardHeader>

              <AnimatePresence>
                {showCreateGoal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Goal Title</label>
                          <input
                            type="text"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            placeholder="New microphones"
                            className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Target Amount ($)</label>
                          <input
                            type="number"
                            value={newGoalTarget}
                            onChange={(e) => setNewGoalTarget(e.target.value)}
                            placeholder="100"
                            className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description (Optional)</label>
                        <textarea
                          value={newGoalDescription}
                          onChange={(e) => setNewGoalDescription(e.target.value)}
                          placeholder="Help us upgrade our equipment..."
                          className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background h-20 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleCreateGoal}
                          disabled={!newGoalTitle || !newGoalTarget || isCreatingGoal}
                          className="flex-1"
                        >
                          {isCreatingGoal ? 'Creating...' : 'Create Goal'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCreateGoal(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

          <div className="space-y-4">
            {sessionGoals.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No Active Goals</h3>
                  <p className="text-sm text-muted-foreground">
                    {isHost ? 'Create a tip goal to engage your audience!' : 'The host hasn\'t set any tip goals yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              sessionGoals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const isCompleted = progress >= 100;
                
                return (
                  <Card key={goal.id} className={`bg-card/50 backdrop-blur-sm ${isCompleted ? 'border-green-500/50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-medium mb-1 flex items-center gap-2">
                            {goal.title}
                            {isCompleted && <Badge className="bg-green-500">Completed!</Badge>}
                          </h3>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${goal.currentAmount} / ${goal.targetAmount}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {goal.contributors} contributor{goal.contributors !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      
                      <Progress value={Math.min(progress, 100)} className="h-3 mb-2" />
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {Math.round(progress)}% funded
                        </span>
                        <span className="text-muted-foreground">
                          ${goal.targetAmount - goal.currentAmount} to go
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Top Tippers Tab */}
        <TabsContent value="leaderboard">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Top Supporters
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topTippers.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No tips yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topTippers.map((tipper, index) => (
                    <div key={tipper.userName} className="flex items-center gap-4">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-muted text-muted-foreground'
                        }
                      `}>
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium">{tipper.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          {tipper.tipCount} tip{tipper.tipCount !== 1 ? 's' : ''} • {formatTimeAgo(tipper.lastTip)}
                        </div>
                      </div>
                      
                      <Badge className="bg-green-500 text-white">
                        ${tipper.amount}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Tips Tab */}
        <TabsContent value="recent">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recentTips.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No tips yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTips.map((tip) => (
                      <div key={tip.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        {!tip.isAnonymous && tip.userAvatar && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={tip.userAvatar} alt={tip.userName} />
                            <AvatarFallback>{tip.userName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {tip.isAnonymous ? 'Anonymous' : tip.userName}
                            </span>
                            <Badge className={`
                              ${tip.type === 'super_chat' ? 'bg-yellow-500 text-black' :
                                tip.type === 'goal_contribution' ? 'bg-blue-500 text-white' :
                                'bg-green-500 text-white'
                              }
                            `}>
                              ${tip.amount}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(tip.timestamp)}
                            </span>
                          </div>
                          
                          {tip.message && (
                            <p className="text-sm text-muted-foreground">
                              "{tip.message}"
                            </p>
                          )}
                        </div>
                        
                        {tip.type === 'super_chat' && (
                          <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Tip Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.hourlyBreakdown.map((hour, index) => (
                    <div key={hour.hour} className="flex items-center gap-4">
                      <div className="w-16 text-sm text-muted-foreground">
                        {hour.hour}
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={(hour.amount / Math.max(...stats.hourlyBreakdown.map(h => h.amount))) * 100} 
                          className="h-2"
                        />
                      </div>
                      <div className="w-16 text-sm font-medium text-right">
                        ${hour.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold mb-1">{Math.round(stats.totalAmount / stats.totalTips)}</div>
                  <div className="text-sm text-muted-foreground">Average Tip</div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold mb-1">
                    {Math.round((stats.totalTips / 120) * 60)} {/* Assuming 2 hour session */}
                  </div>
                  <div className="text-sm text-muted-foreground">Tips per Hour</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}