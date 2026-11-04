import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../hooks/useAuth';

export default function CommunityDebugPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testCreatePost = async () => {
    addLog('🔍 Testing post creation...');
    
    try {
      // Get API credentials
      const { projectId } = await import('../utils/supabase/info');
      const { supabase } = await import('../utils/supabase/client');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
      
      addLog(`📡 Base URL: ${baseUrl}`);
      
      // Get session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`❌ Auth error: ${error.message}`);
        return;
      }
      
      const token = session?.access_token;
      addLog(`🔑 Token available: ${!!token}`);
      addLog(`👤 User ID: ${session?.user?.id || 'None'}`);
      addLog(`📧 User email: ${session?.user?.email || 'None'}`);
      
      if (!token) {
        addLog('❌ No authentication token available');
        return;
      }
      
      // Test API call
      const testPostData = {
        content: 'Test post from debug panel',
        type: 'discussion',
        category: 'General Discussion',
        tags: [],
        mediaUrls: []
      };
      
      addLog('📤 Sending POST request...');
      
      const response = await fetch(`${baseUrl}/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(testPostData),
      });
      
      addLog(`📨 Response status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      addLog(`📄 Response body: ${responseText.substring(0, 200)}...`);
      
      if (response.ok) {
        const result = JSON.parse(responseText);
        if (result.success) {
          addLog('✅ Post created successfully!');
          addLog(`🆔 Post ID: ${result.data.id}`);
        } else {
          addLog(`❌ API error: ${result.error}`);
        }
      } else {
        addLog(`❌ HTTP error: ${response.status}`);
      }
      
    } catch (error) {
      addLog(`💥 Exception: ${error.message}`);
      console.error('Debug test error:', error);
    }
  };

  const testFetchPosts = async () => {
    addLog('🔍 Testing post fetching...');
    
    try {
      const { projectId } = await import('../utils/supabase/info');
      const { supabase } = await import('../utils/supabase/client');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'anonymous';
      
      addLog(`📡 Fetching from: ${baseUrl}/community/posts`);
      addLog(`🔑 Using token: ${token.substring(0, 20)}...`);
      
      const response = await fetch(`${baseUrl}/community/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      addLog(`📨 Response status: ${response.status}`);
      
      const responseText = await response.text();
      addLog(`📄 Response: ${responseText.substring(0, 300)}...`);
      
      if (response.ok) {
        const result = JSON.parse(responseText);
        if (result.success) {
          addLog(`✅ Found ${result.data.posts.length} posts`);
          result.data.posts.forEach((post: any, index: number) => {
            addLog(`📝 Post ${index + 1}: ${post.id} - "${post.content.substring(0, 50)}..."`);
          });
        } else {
          addLog(`❌ API error: ${result.error}`);
        }
      } else {
        addLog(`❌ HTTP error: ${response.status}`);
      }
      
    } catch (error) {
      addLog(`💥 Exception: ${error.message}`);
      console.error('Debug fetch error:', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-red-500 text-white border-red-600 hover:bg-red-600"
        >
          🐛 Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 bg-black/80 backdrop-blur z-50 overflow-auto">
      <div className="max-w-4xl mx-auto p-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-400">🐛 Community Debug Panel</CardTitle>
              <Button 
                onClick={() => setIsVisible(false)}
                variant="ghost" 
                size="sm"
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Auth Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Badge variant={isLoggedIn ? "default" : "destructive"}>
                  Auth: {isLoggedIn ? 'Logged In' : 'Not Logged In'}
                </Badge>
              </div>
              <div>
                <Badge variant="outline">
                  User: {user?.email || 'None'}
                </Badge>
              </div>
              <div>
                <Badge variant="outline">
                  ID: {user?.id?.substring(0, 8) || 'None'}...
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={testCreatePost} variant="default" size="sm">
                🧪 Test Create Post
              </Button>
              <Button onClick={testFetchPosts} variant="default" size="sm">
                📥 Test Fetch Posts
              </Button>
              <Button onClick={clearLogs} variant="outline" size="sm">
                🗑️ Clear Logs
              </Button>
            </div>

            {/* Logs */}
            <div className="bg-black p-4 rounded-lg max-h-96 overflow-y-auto">
              <div className="font-mono text-sm text-green-400">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground">No logs yet. Click a test button above.</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}