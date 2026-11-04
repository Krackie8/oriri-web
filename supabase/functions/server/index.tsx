import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'
import * as vipHelpers from './vipHelpers.ts'
import { registerVipRoutes } from './vipRoutes.ts'

const app = new Hono()

app.use('*', logger(console.log))
// Allow production domain, Figma Make preview, and local dev
const ALLOWED_ORIGINS = [
  'https://oriri.me',
  'https://www.oriri.me',
  'https://new.oriri.me', // staging
];

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return ALLOWED_ORIGINS[0];
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // Allow Figma Make preview environment
    if (origin.endsWith('.figma.com') || origin === 'https://figma.com') return origin;
    // Allow local development
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Initialize storage on server startup (optional - only if storage is needed)
const initializeStorage = async () => {
  try {
    console.log('🔧 Checking if Supabase Storage is available...');
    
    // Test if storage is available by making a simple request
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('⚠️ Supabase Storage not available or not configured:', listError.message);
      console.log('📝 Storage features will be disabled. This is normal for basic Supabase setups.');
      return;
    }
    
    console.log('✅ Supabase Storage is available');
    console.log('📦 Available buckets:', buckets?.map(b => b.name) || []);
    
    const bucketName = 'make-a278ea32-episodes';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('🔨 Creating storage bucket:', bucketName);
      
      const { error: createError } = await supabase.storage.createBucket(bucketName, { 
        public: false
      });
      
      if (createError) {
        if (createError.message && (createError.message.includes('already exists') || createError.message.includes('409'))) {
          console.log('✅ Bucket already exists');
        } else {
          console.log('⚠️ Could not create bucket:', createError.message);
          console.log('📝 This is normal if storage quotas are exceeded or not configured');
        }
      } else {
        console.log('✅ Storage bucket created successfully');
      }
    } else {
      console.log('✅ Storage bucket already exists');
    }
    
    console.log('=== Storage initialization complete ===');
  } catch (error) {
    console.log('⚠️ Storage initialization failed:', error.message || error);
    console.log('📝 Storage features will be unavailable but the server will continue normally');
  }
};

// Initialize storage when server starts (non-blocking)
initializeStorage().catch(err => {
  console.log('⚠️ Storage initialization failed during startup:', err.message || err);
  console.log('📝 Server will continue without storage features');
});

// Initialize VIP system on server startup
const initializeVipSystem = async () => {
  try {
    console.log('🔧 Initializing VIP subscription system...');
    
    // Initialize default VIP tier if it doesn't exist
    const defaultTier = await vipHelpers.initializeDefaultTier('system');
    console.log('✅ Default VIP tier initialized:', defaultTier.displayName);
    
    console.log('=== VIP system initialization complete ===');
  } catch (error) {
    console.log('⚠️ VIP system initialization failed:', error.message || error);
    console.log('📝 VIP features may not work correctly');
  }
};

// Initialize VIP system when server starts (non-blocking)
initializeVipSystem().catch(err => {
  console.log('⚠️ VIP system initialization failed during startup:', err.message || err);
  console.log('📝 Server will continue but VIP features may not work');
});

// Register VIP API routes
registerVipRoutes(app, supabase);

// Initialize storage manually route
app.post('/make-server-a278ea32/init-storage', async (c) => {
  try {
    console.log('Manual storage initialization requested');
    await initializeStorage();
    
    const bucketName = 'make-a278ea32-episodes';
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    return c.json({
      success: true,
      message: 'Storage initialization completed',
      bucketExists: buckets?.some(bucket => bucket.name === bucketName) || false,
      availableBuckets: buckets?.map(b => b.name) || [],
      error: error?.message || null
    });
  } catch (error) {
    console.error('Manual storage initialization error:', error);
    return c.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// User info route for debugging
app.get('/make-server-a278ea32/user-info', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
        role: user.user_metadata?.role,
        isAdmin: user.user_metadata?.role === 'admin' || 
                user.email === 'admin@oriri.com' ||
                user.user_metadata?.isAdmin === true
      }
    });
  } catch (error) {
    console.log('Error fetching user info:', error);
    return c.json({ success: false, error: 'Failed to fetch user info' }, 500);
  }
});

// Make current user admin (temporary route for testing)
app.post('/make-server-a278ea32/make-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Update user metadata to include admin role
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: 'admin',
        isAdmin: true
      }
    });

    if (updateError) {
      console.log('Error making user admin:', updateError);
      return c.json({ success: false, error: 'Failed to update user role' }, 500);
    }

    return c.json({
      success: true,
      message: 'User successfully made admin',
      userId: user.id
    });
  } catch (error) {
    console.log('Error in make-admin route:', error);
    return c.json({ success: false, error: 'Failed to make user admin' }, 500);
  }
});

// Health check route - Unified endpoint with detailed diagnostics
app.get('/make-server-a278ea32/health', async (c) => {
  try {
    const bucketName = 'make-a278ea32-episodes';
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    return c.json({
      success: true,
      status: 'healthy',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      storage: {
        available: !error,
        bucketExists: buckets?.some(bucket => bucket.name === bucketName) || false,
        error: error?.message || null
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, 500);
  }
});

// File upload route
app.post('/make-server-a278ea32/upload', async (c) => {
  try {
    console.log('Upload request received');
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    console.log('File:', file ? `${file.name} (${file.size} bytes)` : 'none');
    console.log('Path:', path);

    if (!file || !path) {
      console.error('Missing file or path');
      return c.json({ error: 'File and path are required' }, 400);
    }

    // Create the bucket if it doesn't exist
    const bucketName = 'make-a278ea32-episodes';
    console.log('Checking if bucket exists:', bucketName);
    
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return c.json({ error: 'Failed to access storage' }, 500);
      }
      
      console.log('Available buckets:', buckets?.map(b => b.name));
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log('Creating bucket:', bucketName);
        const { error: createError } = await supabase.storage.createBucket(bucketName, { 
          public: false
          // Remove file size limit to handle large files
        });
        
        if (createError) {
          // Check if it's just because bucket already exists
          if (createError.message.includes('already exists') || createError.message.includes('409')) {
            console.log('Bucket already exists, continuing...');
          } else {
            console.error('Error creating bucket:', createError);
            return c.json({ error: 'Failed to create storage bucket', details: createError.message }, 500);
          }
        } else {
          console.log('Bucket created successfully');
        }
      } else {
        console.log('Bucket already exists');
      }
    } catch (bucketError) {
      console.error('Bucket management error:', bucketError);
      return c.json({ error: 'Storage bucket error', details: bucketError.message }, 500);
    }

    // Upload the file
    const fileName = `${path}/${Date.now()}-${file.name}`;
    console.log('Uploading file as:', fileName);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[Supabase] Upload error:', error);
      return c.json({ error: 'Upload failed', details: error.message }, 500);
    }

    console.log('File uploaded successfully:', data);

    // Get a signed URL for the uploaded file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      // Return the basic path even if signed URL fails
      return c.json({ 
        url: `${bucketName}/${fileName}`,
        path: fileName,
        warning: 'Signed URL creation failed'
      });
    }

    console.log('Signed URL created successfully');
    return c.json({ 
      url: signedUrlData?.signedUrl || `${bucketName}/${fileName}`,
      path: fileName 
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// Helper function to categorize sessions based on time
const categorizeSessionByTime = (session: any) => {
  try {
    const now = new Date();
    const scheduledTime = new Date(session.scheduledTime);
    
    // Parse duration (assume format like "60 min", "1 hour", etc.)
    let durationMinutes = 60; // default to 60 minutes
    if (session.duration) {
      const durationMatch = session.duration.match(/(\d+)\s*(min|hour|hr)/i);
      if (durationMatch) {
        const value = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        if (unit.startsWith('hour') || unit === 'hr') {
          durationMinutes = value * 60;
        } else {
          durationMinutes = value;
        }
      }
    }
    
    const endTime = new Date(scheduledTime.getTime() + (durationMinutes * 60 * 1000));
    
    // Categorize based on time
    if (now < scheduledTime) {
      return 'upcoming';
    } else if (now >= scheduledTime && now <= endTime) {
      return 'ongoing';
    } else {
      return 'archived';
    }
  } catch (error) {
    console.log('Error categorizing session by time:', error);
    // Default to upcoming if there's an error parsing
    return 'upcoming';
  }
};

// Live Sessions Routes
app.get('/make-server-a278ea32/live-sessions', async (c) => {
  try {
    const type = c.req.query('type') || 'all';
    
    console.log('📅 Fetching live sessions with dynamic time-based categorization...');
    
    // Get all live sessions (using unified prefix)
    const allSessions = await kv.getByPrefix('live_session_') || [];
    
    console.log(`🔍 Found ${allSessions.length} total sessions in database`);
    
    // Categorize sessions based on current time vs scheduled time
    const categorizedSessions = {
      upcoming: [] as any[],
      ongoing: [] as any[],
      archived: [] as any[]
    };
    
    allSessions.forEach(session => {
      const category = categorizeSessionByTime(session);
      categorizedSessions[category].push(session);
      
      console.log(`📊 Session "${session.title}" (${session.scheduledTime}) → ${category}`);
    });
    
    console.log(`📈 Categorization results:`, {
      upcoming: categorizedSessions.upcoming.length,
      ongoing: categorizedSessions.ongoing.length,
      archived: categorizedSessions.archived.length
    });
    
    // Return requested type or all categories
    if (type === 'all') {
      return c.json({ success: true, data: categorizedSessions });
    } else {
      return c.json({ success: true, data: categorizedSessions[type] || [] });
    }
  } catch (error) {
    console.log('Error fetching live sessions:', error);
    return c.json({ success: false, error: 'Failed to fetch live sessions' }, 500);
  }
});

app.post('/make-server-a278ea32/live-sessions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { title, description, scheduledTime, duration, thumbnailUrl, thumbnail, streamPlatform, streamUrl, isLive } = body;

    // Support both thumbnailUrl and thumbnail field names for backwards compatibility
    const sessionThumbnail = thumbnail || thumbnailUrl || 'https://images.unsplash.com/photo-1615411836704-2c1636331bc2?w=300&h=200&fit=crop';

    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      title,
      description,
      scheduledTime,
      duration,
      hostId: user.id,
      hostName: user.user_metadata?.name || user.email,
      hostImage: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1581547848331-0aba76655842?w=40&h=40&fit=crop',
      thumbnail: sessionThumbnail,
      createdAt: new Date().toISOString(),
      viewerCount: 0,
      isLive: isLive || false,
      hasReminder: false,
      streamPlatform: streamPlatform || null,
      streamUrl: streamUrl || null
    };

    // Use unified prefix - sessions will be categorized dynamically based on time
    await kv.set(`live_session_${sessionId}`, session);

    console.log('📝 Created live session:', {
      id: sessionId,
      title: session.title,
      scheduledTime: session.scheduledTime,
      category: categorizeSessionByTime(session)
    });

    return c.json({ success: true, data: session });
  } catch (error) {
    console.log('Error creating live session:', error);
    return c.json({ success: false, error: 'Failed to create live session' }, 500);
  }
});

// PUT route for updating live sessions
app.put('/make-server-a278ea32/live-sessions/:sessionId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const sessionId = c.req.param('sessionId');
    const updates = await c.req.json();

    console.log(`Updating live session: ${sessionId}`, updates);

    // Find the session using unified prefix
    const sessionKey = `live_session_${sessionId}`;
    const existingSession = await kv.get(sessionKey);

    if (!existingSession) {
      return c.json({ success: false, error: 'Live session not found' }, 404);
    }

    // Debug user and session information
    console.log('Update request debug info:');
    console.log('Current user ID:', user.id);
    console.log('Session host ID:', existingSession.hostId);
    console.log('User metadata:', user.user_metadata);

    // Check if user is admin (has admin role or specific admin email)
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com' ||
                   user.user_metadata?.isAdmin === true;

    // Verify user has permission to edit (must be the host OR an admin)
    const canEdit = existingSession.hostId === user.id || isAdmin;
    
    if (!canEdit) {
      console.log('Authorization failed - User is not host or admin');
      return c.json({ 
        success: false, 
        error: 'Unauthorized: Only the host or admin can edit this session',
        debug: {
          currentUserId: user.id,
          sessionHostId: existingSession.hostId,
          isAdmin,
          canEdit
        }
      }, 403);
    }

    console.log('Authorization successful:', canEdit ? 'User can edit' : 'Access denied');

    // Log the updates being applied
    console.log('📝 Updates received for session:', sessionId);
    console.log('🔍 Update fields:', Object.keys(updates));
    
    // Log specifically thumbnail-related updates
    if (updates.thumbnail || updates.thumbnailUrl) {
      console.log('🖼️ Thumbnail updates:', {
        thumbnail: updates.thumbnail,
        thumbnailUrl: updates.thumbnailUrl
      });
    }

    // Update the session with new data
    const updatedSession = {
      ...existingSession,
      ...updates,
      id: sessionId, // Ensure ID doesn't change
      hostId: existingSession.hostId, // Ensure host doesn't change
      updatedAt: new Date().toISOString()
    };

    // Log what the final session looks like
    console.log('📊 Final updated session thumbnail:', updatedSession.thumbnail);
    console.log('📅 Session categorized as:', categorizeSessionByTime(updatedSession));

    // Save the updated session with unified prefix
    await kv.set(sessionKey, updatedSession);

    console.log(`Live session ${sessionId} updated successfully`);
    return c.json({ success: true, data: updatedSession });
  } catch (error) {
    console.log('Error updating live session:', error);
    return c.json({ success: false, error: 'Failed to update live session' }, 500);
  }
});

// DELETE route for deleting live sessions
app.delete('/make-server-a278ea32/live-sessions/:sessionId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const sessionId = c.req.param('sessionId');

    // Find and delete the session using unified prefix
    const sessionKey = `live_session_${sessionId}`;
    const session = await kv.get(sessionKey);
    
    if (!session) {
      return c.json({ success: false, error: 'Live session not found' }, 404);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com' ||
                   user.user_metadata?.isAdmin === true;

    // Verify user has permission to delete (must be the host OR an admin)
    const canDelete = session.hostId === user.id || isAdmin;
    
    if (!canDelete) {
      return c.json({ 
        success: false, 
        error: 'Unauthorized: Only the host or admin can delete this session',
        debug: {
          currentUserId: user.id,
          sessionHostId: session.hostId,
          isAdmin,
          canDelete
        }
      }, 403);
    }
    
    await kv.del(sessionKey);

    console.log(`Live session ${sessionId} deleted successfully`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting live session:', error);
    return c.json({ success: false, error: 'Failed to delete live session' }, 500);
  }
});

// Chat Messages Routes
app.get('/make-server-a278ea32/chat/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const messages = await kv.getByPrefix(`chat_message_${sessionId}_`) || [];
    
    // Sort messages by timestamp
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return c.json({ success: true, data: sortedMessages });
  } catch (error) {
    console.log('Error fetching chat messages:', error);
    return c.json({ success: false, error: 'Failed to fetch chat messages' }, 500);
  }
});

app.post('/make-server-a278ea32/chat/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { message, isSuperChat = false, superChatAmount = 0 } = body;

    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const chatMessage = {
      id: messageId,
      sessionId,
      userId: user.id,
      userName: user.user_metadata?.name || user.email,
      userAvatar: user.user_metadata?.avatar_url || '',
      message,
      timestamp: new Date().toISOString(),
      reactions: [],
      isPinned: false,
      isHidden: false,
      isSuperChat,
      superChatAmount
    };

    await kv.set(`chat_message_${sessionId}_${messageId}`, chatMessage);

    // Update viewer count for the session
    const ongoingSession = await kv.get(`live_session_ongoing_${sessionId}`);
    if (ongoingSession) {
      const updatedSession = {
        ...ongoingSession,
        viewerCount: (ongoingSession.viewerCount || 0) + 1
      };
      await kv.set(`live_session_ongoing_${sessionId}`, updatedSession);
    }

    return c.json({ success: true, data: chatMessage });
  } catch (error) {
    console.log('Error sending chat message:', error);
    return c.json({ success: false, error: 'Failed to send message' }, 500);
  }
});

// Message Reactions Route
app.post('/make-server-a278ea32/chat/:sessionId/:messageId/react', async (c) => {
  try {
    const { sessionId, messageId } = c.req.param();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { emoji } = body;

    const message = await kv.get(`chat_message_${sessionId}_${messageId}`);
    if (!message) {
      return c.json({ success: false, error: 'Message not found' }, 404);
    }

    // Update reactions
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    let updatedReactions;
    
    if (existingReaction) {
      updatedReactions = message.reactions.map(r =>
        r.emoji === emoji ? { ...r, count: r.count + 1 } : r
      );
    } else {
      updatedReactions = [...message.reactions, { emoji, count: 1 }];
    }

    const updatedMessage = { ...message, reactions: updatedReactions };
    await kv.set(`chat_message_${sessionId}_${messageId}`, updatedMessage);

    return c.json({ success: true, data: updatedMessage });
  } catch (error) {
    console.log('Error adding reaction:', error);
    return c.json({ success: false, error: 'Failed to add reaction' }, 500);
  }
});

// Tips Route
app.post('/make-server-a278ea32/tips', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { sessionId, amount, message = '' } = body;

    const tipId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tip = {
      id: tipId,
      sessionId,
      fromUserId: user.id,
      fromUserName: user.user_metadata?.name || user.email,
      amount,
      message,
      timestamp: new Date().toISOString()
    };

    await kv.set(`tip_${tipId}`, tip);

    // Update session stats
    const sessionTipsKey = `session_tips_${sessionId}`;
    const sessionTips = await kv.get(sessionTipsKey) || { total: 0, count: 0 };
    sessionTips.total += amount;
    sessionTips.count += 1;
    await kv.set(sessionTipsKey, sessionTips);

    return c.json({ success: true, data: tip });
  } catch (error) {
    console.log('Error processing tip:', error);
    return c.json({ success: false, error: 'Failed to process tip' }, 500);
  }
});

// Reminders Route
app.post('/make-server-a278ea32/reminders', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { sessionId, action } = body; // action: 'set' or 'remove'

    const reminderKey = `reminder_${user.id}_${sessionId}`;
    
    if (action === 'set') {
      const reminder = {
        userId: user.id,
        sessionId,
        createdAt: new Date().toISOString()
      };
      await kv.set(reminderKey, reminder);
    } else if (action === 'remove') {
      await kv.del(reminderKey);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error managing reminder:', error);
    return c.json({ success: false, error: 'Failed to manage reminder' }, 500);
  }
});

// Get user reminders
app.get('/make-server-a278ea32/reminders', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const reminders = await kv.getByPrefix(`reminder_${user.id}_`) || [];
    return c.json({ success: true, data: reminders });
  } catch (error) {
    console.log('Error fetching reminders:', error);
    return c.json({ success: false, error: 'Failed to fetch reminders' }, 500);
  }
});

// Episode Management Routes
app.get('/make-server-a278ea32/episodes', async (c) => {
  try {
    console.log('Fetching all episodes from KV store...');
    const episodes = await kv.getByPrefix('managed_episode_') || [];
    console.log(`Found ${episodes.length} episodes in backend`);
    return c.json(episodes);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return c.json({ error: 'Failed to fetch episodes' }, 500);
  }
});

app.post('/make-server-a278ea32/episodes', async (c) => {
  try {
    console.log('Creating new episode in backend...');
    
    // ✅ Admin authentication check
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      console.error('Unauthorized episode creation attempt');
      return c.json({ success: false, error: 'Unauthorized - Please login' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    
    if (!isAdmin) {
      console.error('Non-admin user attempted to create episode:', user.email);
      return c.json({ 
        success: false, 
        error: 'Forbidden - Admin access required to create episodes' 
      }, 403);
    }

    const episode = await c.req.json();
    
    // Store episode in KV store with a consistent key format
    const key = `managed_episode_${episode.id}`;
    await kv.set(key, episode);
    
    console.log(`Episode saved with key: ${key} by admin: ${user.email}`);
    return c.json({ success: true, episode });
  } catch (error) {
    console.error('Error creating episode:', error);
    return c.json({ error: 'Failed to create episode' }, 500);
  }
});

app.put('/make-server-a278ea32/episodes/:id', async (c) => {
  try {
    // ✅ Admin authentication check
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      console.error('Unauthorized episode update attempt');
      return c.json({ success: false, error: 'Unauthorized - Please login' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    
    if (!isAdmin) {
      console.error('Non-admin user attempted to update episode:', user.email);
      return c.json({ 
        success: false, 
        error: 'Forbidden - Admin access required to update episodes' 
      }, 403);
    }

    const episodeId = c.req.param('id');
    const updates = await c.req.json();
    
    // Get existing episode
    const key = `managed_episode_${episodeId}`;
    const existing = await kv.get(key);
    
    if (!existing) {
      return c.json({ error: 'Episode not found' }, 404);
    }
    
    // Update episode
    const updated = { ...existing, ...updates, updatedDate: new Date().toISOString() };
    await kv.set(key, updated);
    
    console.log(`Episode ${episodeId} updated by admin: ${user.email}`);
    return c.json({ success: true, episode: updated });
  } catch (error) {
    console.error('Error updating episode:', error);
    return c.json({ error: 'Failed to update episode' }, 500);
  }
});

app.delete('/make-server-a278ea32/episodes/:id', async (c) => {
  try {
    // ✅ Admin authentication check
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      console.error('Unauthorized episode deletion attempt');
      return c.json({ success: false, error: 'Unauthorized - Please login' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    
    if (!isAdmin) {
      console.error('Non-admin user attempted to delete episode:', user.email);
      return c.json({ 
        success: false, 
        error: 'Forbidden - Admin access required to delete episodes' 
      }, 403);
    }

    const episodeId = c.req.param('id');
    const key = `managed_episode_${episodeId}`;
    
    await kv.del(key);
    console.log(`Episode ${episodeId} deleted by admin: ${user.email}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting episode:', error);
    return c.json({ error: 'Failed to delete episode' }, 500);
  }
});

// Migrate live sessions to unified prefix system
app.post('/make-server-a278ea32/migrate-live-sessions', async (c) => {
  try {
    console.log('🔄 Starting live session migration to unified prefix system...');
    
    // Get all sessions with old prefixes
    const [oldUpcoming, oldOngoing, oldArchived] = await Promise.all([
      kv.getByPrefix('live_session_upcoming_'),
      kv.getByPrefix('live_session_ongoing_'),
      kv.getByPrefix('live_session_archived_')
    ]);
    
    const allOldSessions = [...(oldUpcoming || []), ...(oldOngoing || []), ...(oldArchived || [])];
    console.log(`📊 Found ${allOldSessions.length} sessions to migrate`);
    
    // Migrate each session to the new unified prefix
    const migrationPromises = allOldSessions.map(async (session) => {
      try {
        // Use the session's ID for the new key
        const newKey = `live_session_${session.id}`;
        await kv.set(newKey, session);
        
        console.log(`✅ Migrated session: ${session.title} (${session.id})`);
        return { success: true, sessionId: session.id };
      } catch (error) {
        console.log(`❌ Failed to migrate session ${session.id}:`, error);
        return { success: false, sessionId: session.id, error: error.message };
      }
    });
    
    const migrationResults = await Promise.all(migrationPromises);
    const successCount = migrationResults.filter(r => r.success).length;
    
    console.log(`📈 Migration complete: ${successCount}/${allOldSessions.length} sessions migrated`);
    
    return c.json({ 
      success: true, 
      message: `Migration completed: ${successCount}/${allOldSessions.length} sessions migrated`,
      results: migrationResults
    });
  } catch (error) {
    console.log('Error migrating live sessions:', error);
    return c.json({ success: false, error: 'Failed to migrate live sessions' }, 500);
  }
});

// Clear live sessions data
app.post('/make-server-a278ea32/clear-live-data', async (c) => {
  try {
    console.log('🧹 Clearing old live session data...');
    
    // Delete all existing live session data including mock sessions with old prefixes
    await Promise.all([
      kv.del('live_session_ongoing_ongoing_1'),
      kv.del('live_session_archived_archived_1'),
      kv.del('chat_message_ongoing_1_msg_1'),
      kv.del('chat_message_ongoing_1_msg_2'),
      kv.del('chat_message_ongoing_1_msg_3'),
      // Delete mock upcoming sessions
      kv.del('live_session_upcoming_upcoming_1'),
      kv.del('live_session_upcoming_upcoming_2'),
    ]);

    // Also clear any sessions with old prefixes
    const [oldUpcoming, oldOngoing, oldArchived] = await Promise.all([
      kv.getByPrefix('live_session_upcoming_'),
      kv.getByPrefix('live_session_ongoing_'),
      kv.getByPrefix('live_session_archived_')
    ]);
    
    const allOldSessions = [...(oldUpcoming || []), ...(oldOngoing || []), ...(oldArchived || [])];
    
    // Delete old prefix sessions
    const deletePromises = allOldSessions.map(session => {
      // Find and delete the old key - need to reconstruct it
      for (const type of ['upcoming', 'ongoing', 'archived']) {
        const oldKey = `live_session_${type}_${session.id}`;
        return kv.del(oldKey);
      }
    });
    
    await Promise.all(deletePromises.flat());
    
    console.log(`🗑️ Cleared ${allOldSessions.length} sessions with old prefixes`);

    return c.json({ success: true, message: 'Live session data cleared successfully' });
  } catch (error) {
    console.log('Error clearing live data:', error);
    return c.json({ success: false, error: 'Failed to clear live data' }, 500);
  }
});

// Seed data
app.post('/make-server-a278ea32/seed-data', async (c) => {
  try {
    // No sample live sessions - admin creates real ones through dashboard

    // No ongoing or archived sessions since creator hasn't done any live streams yet
    // Chat messages removed since there are no ongoing sessions

    // Sample episode comments
    const comment1 = {
      id: 'comment_1',
      episodeId: 'spotify_rss_1',
      userId: 'user_1',
      userName: 'Alex Thompson',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
      content: 'This episode was absolutely brilliant! The way you explained the complex concepts made everything so clear. Looking forward to more content like this.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      likes: 12,
      replies: [],
      isLiked: false
    };

    const comment2 = {
      id: 'comment_2',
      episodeId: 'spotify_rss_1',
      userId: 'user_2',
      userName: 'Sarah Chen',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=40&h=40&fit=crop',
      content: 'I love how practical and actionable your advice is. This episode gave me so many ideas to implement in my own work. Thank you for sharing your insights!',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      likes: 8,
      replies: [],
      isLiked: false
    };

    const comment3 = {
      id: 'comment_3',
      episodeId: 'spotify_rss_1',
      userId: 'user_3',
      userName: 'Mike Rodriguez',
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
      content: 'Great episode as always! Quick question though - could you elaborate more on the point you made around the 15-minute mark about implementation strategies?',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      likes: 5,
      replies: [],
      isLiked: false
    };

    // Sample episode metrics
    const episodeMetrics = {
      totalLikes: 25,
      totalComments: 3,
      totalShares: 7,
      totalViews: 142,
      recentUsers: [
        {
          id: 'user_1',
          name: 'Alex Thompson',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop'
        },
        {
          id: 'user_2',
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=40&h=40&fit=crop'
        },
        {
          id: 'user_3',
          name: 'Mike Rodriguez',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop'
        },
        {
          id: 'user_4',
          name: 'Emma Wilson',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop'
        },
        {
          id: 'user_5',
          name: 'David Kim',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop'
        }
      ]
    };

    // Store all data (excluding mock live sessions)
    await Promise.all([
      // No mock live sessions stored - admin creates real ones through dashboard
      kv.set('episode_comment_spotify_rss_1_comment_1', comment1),
      kv.set('episode_comment_spotify_rss_1_comment_2', comment2),
      kv.set('episode_comment_spotify_rss_1_comment_3', comment3),
      kv.set('episode_metrics_spotify_rss_1', episodeMetrics),
      // Add metrics for mock episode IDs to ensure they sync properly
      kv.set('episode_metrics_spotify_1', { ...episodeMetrics, totalViews: 47, totalLikes: 12 }),
      kv.set('episode_metrics_youtube_1', { ...episodeMetrics, totalViews: 89, totalLikes: 18 }),
      kv.set('episode_metrics_apple_1', { ...episodeMetrics, totalViews: 23, totalLikes: 7 }),
      kv.set('episode_metrics_spotify_2', { ...episodeMetrics, totalViews: 156, totalLikes: 31 }),
      kv.set('episode_metrics_youtube_2', { ...episodeMetrics, totalViews: 92, totalLikes: 15 }),
      kv.set('episode_metrics_apple_2', { ...episodeMetrics, totalViews: 64, totalLikes: 9 })
    ]);

    return c.json({ success: true, message: 'Sample data seeded successfully' });
  } catch (error) {
    console.log('Error seeding data:', error);
    return c.json({ success: false, error: 'Failed to seed data' }, 500);
  }
});

// Demo User Setup Route - Simplified and more robust
app.post('/make-server-a278ea32/setup-demo-user', async (c) => {
  try {
    console.log('Starting demo user setup...');
    
    const demoUsers = [
      { email: 'demo@oriri.com', password: 'demo123', name: 'Demo User' },
      { email: 'test@oriri.com', password: 'test123', name: 'Test User' }
    ];
    
    const results = [];
    
    for (const demoUser of demoUsers) {
      try {
        console.log(`Processing user: ${demoUser.email}`);
        
        // Try to create user first (will fail if exists)
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: demoUser.email,
          password: demoUser.password,
          user_metadata: { 
            name: demoUser.name,
            role: 'user'
          },
          email_confirm: true
        });

        if (!createError) {
          // Successfully created new user
          console.log(`Created new demo user: ${demoUser.email} - ${createData.user?.id}`);
          results.push({
            email: demoUser.email,
            status: 'created',
            userId: createData.user?.id,
            emailConfirmed: true
          });
          continue;
        }

        // User might already exist, let's find and update them
        if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
          console.log(`User already exists: ${demoUser.email}, checking confirmation status...`);
          
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users?.users?.find(user => user.email === demoUser.email);
          
          if (existingUser) {
            // Update user to ensure email is confirmed and password is correct
            console.log(`Updating existing user: ${demoUser.email}`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
              password: demoUser.password,
              email_confirm: true,
              user_metadata: {
                name: demoUser.name,
                role: 'user'
              }
            });
            
            if (updateError) {
              console.log(`Error updating user ${demoUser.email}:`, updateError);
            }
            
            results.push({
              email: demoUser.email,
              status: 'updated',
              userId: existingUser.id,
              emailConfirmed: true
            });
          } else {
            results.push({
              email: demoUser.email,
              status: 'error',
              error: 'User exists but could not be found'
            });
          }
        } else {
          console.log(`Unexpected error creating user ${demoUser.email}:`, createError);
          results.push({
            email: demoUser.email,
            status: 'error',
            error: createError.message
          });
        }
      } catch (userError) {
        console.log(`Exception processing user ${demoUser.email}:`, userError);
        results.push({
          email: demoUser.email,
          status: 'error',
          error: 'Processing exception'
        });
      }
    }
    
    console.log('Demo user setup completed:', results);
    
    return c.json({ 
      success: true, 
      message: 'Demo user setup completed',
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('Fatal error in demo user setup:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to setup demo users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Admin Registration Route
app.post('/make-server-a278ea32/setup-admin', async (c) => {
  try {
    console.log('Starting admin setup...');
    
    const body = await c.req.json();
    const { email, password, name } = body;
    
    // Default admin if no parameters provided
    const adminEmail = email || 'admin@oriri.com';
    const adminPassword = password || 'admin123';
    const adminName = name || 'Oriri Admin';
    
    console.log(`Setting up admin user: ${adminEmail}`);
    
    try {
      // First, try to find if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(user => user.email === adminEmail);
      
      if (existingUser) {
        console.log(`Admin user already exists: ${adminEmail}, updating with admin privileges...`);
        
        // Update existing user to have admin privileges
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            name: adminName,
            role: 'admin',
            isCreator: true
          }
        });
        
        if (updateError) {
          console.log(`Error updating admin user:`, updateError);
          return c.json({
            success: false,
            error: 'Failed to update existing admin user',
            details: updateError.message
          }, 500);
        }
        
        console.log(`Successfully updated admin user: ${adminEmail}`);
        return c.json({
          success: true,
          message: 'Admin user updated successfully',
          admin: {
            email: adminEmail,
            userId: existingUser.id,
            name: adminName,
            status: 'updated'
          },
          credentials: {
            email: adminEmail,
            password: adminPassword
          }
        });
      } else {
        // Create new admin user
        console.log(`Creating new admin user: ${adminEmail}`);
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          user_metadata: { 
            name: adminName,
            role: 'admin',
            isCreator: true
          },
          email_confirm: true
        });

        if (createError) {
          console.log(`Error creating admin user:`, createError);
          return c.json({
            success: false,
            error: 'Failed to create admin user',
            details: createError.message
          }, 500);
        }

        console.log(`Successfully created admin user: ${adminEmail} - ${createData.user?.id}`);
        return c.json({
          success: true,
          message: 'Admin user created successfully',
          admin: {
            email: adminEmail,
            userId: createData.user?.id,
            name: adminName,
            status: 'created'
          },
          credentials: {
            email: adminEmail,
            password: adminPassword
          }
        });
      }
      
    } catch (userError) {
      console.log(`Exception processing admin user:`, userError);
      return c.json({
        success: false,
        error: 'Exception during admin creation',
        details: userError instanceof Error ? userError.message : 'Unknown error'
      }, 500);
    }
    
  } catch (error) {
    console.log('Fatal error in admin setup:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to setup admin user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Admin Check Route
app.get('/make-server-a278ea32/check-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    const isCreator = user.user_metadata?.isCreator === true;
    
    return c.json({
      success: true,
      isAdmin,
      isCreator,
      userRole: user.user_metadata?.role || 'user',
      userData: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email
      }
    });
  } catch (error) {
    console.log('Error checking admin status:', error);
    return c.json({ success: false, error: 'Failed to check admin status' }, 500);
  }
});

// List All Admins (Admin Only)
app.get('/make-server-a278ea32/list-admins', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if requesting user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    
    if (!isAdmin) {
      return c.json({ success: false, error: 'Forbidden - Admin access required' }, 403);
    }

    // List all users
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(listError.message);
    }

    const allUsers = usersData.users.map(u => ({
      id: u.id,
      email: u.email || '',
      name: u.user_metadata?.name || u.email || 'Unknown',
      role: u.user_metadata?.role || 'user',
      isCreator: u.user_metadata?.isCreator === true,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at
    }));

    const admins = allUsers.filter(u => u.role === 'admin' || u.isCreator);

    return c.json({
      success: true,
      admins,
      allUsers
    });
  } catch (error) {
    console.log('Error listing admins:', error);
    return c.json({ success: false, error: 'Failed to list admins' }, 500);
  }
});

// Create New Admin (Admin Only)
app.post('/make-server-a278ea32/create-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if requesting user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    
    if (!isAdmin) {
      return c.json({ success: false, error: 'Forbidden - Admin access required' }, 403);
    }

    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return c.json({ success: false, error: 'Email, password, and name are required' }, 400);
    }

    // Create new admin user
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name,
        role: 'admin',
        isCreator: false
      },
      email_confirm: true
    });

    if (createError) {
      throw new Error(createError.message);
    }

    console.log(`Admin created new admin user: ${email} by ${user.email}`);

    return c.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: createData.user?.id,
        email,
        name
      }
    });
  } catch (error) {
    console.log('Error creating admin:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create admin' 
    }, 500);
  }
});

// Promote User to Admin (Admin Only)
app.post('/make-server-a278ea32/promote-to-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if requesting user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    
    if (!isAdmin) {
      return c.json({ success: false, error: 'Forbidden - Admin access required' }, 403);
    }

    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    // Find user by email
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(listError.message);
    }

    const targetUser = usersData.users.find(u => u.email === email);

    if (!targetUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Update user to admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...targetUser.user_metadata,
        role: 'admin'
      }
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log(`User promoted to admin: ${email} by ${user.email}`);

    return c.json({
      success: true,
      message: 'User promoted to admin successfully'
    });
  } catch (error) {
    console.log('Error promoting user:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to promote user' 
    }, 500);
  }
});

// Revoke Admin Access (Admin Only)
app.post('/make-server-a278ea32/revoke-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if requesting user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    
    if (!isAdmin) {
      return c.json({ success: false, error: 'Forbidden - Admin access required' }, 403);
    }

    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ success: false, error: 'User ID is required' }, 400);
    }

    // Get target user
    const { data: targetUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);

    if (getUserError || !targetUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Prevent revoking creator's access
    if (targetUser.user.user_metadata?.isCreator === true) {
      return c.json({ success: false, error: 'Cannot revoke creator access' }, 403);
    }

    // Update user to regular user
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...targetUser.user.user_metadata,
        role: 'user'
      }
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log(`Admin access revoked for: ${targetUser.user.email} by ${user.email}`);

    return c.json({
      success: true,
      message: 'Admin access revoked successfully'
    });
  } catch (error) {
    console.log('Error revoking admin:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to revoke admin access' 
    }, 500);
  }
});


// Episode Like Route
app.post('/make-server-a278ea32/episode-like', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { episodeId } = body;

    const likeKey = `episode_like_${episodeId}_${user.id}`;
    const existingLike = await kv.get(likeKey);
    
    let isLiked = false;
    if (existingLike) {
      // Unlike - remove the like
      await kv.del(likeKey);
      isLiked = false;
    } else {
      // Like - add the like
      await kv.set(likeKey, {
        episodeId,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      isLiked = true;
    }

    // Count total likes for this episode
    const allLikes = await kv.getByPrefix(`episode_like_${episodeId}_`) || [];
    const newCount = allLikes.length;

    // Update episode metrics
    let metrics = await kv.get(`episode_metrics_${episodeId}`) || {
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      recentUsers: []
    };
    metrics.totalLikes = newCount;
    await kv.set(`episode_metrics_${episodeId}`, metrics);

    return c.json({
      success: true,
      isLiked,
      newCount
    });
  } catch (error) {
    console.log('Error liking episode:', error);
    return c.json({ success: false, error: 'Failed to like episode' }, 500);
  }
});

// ✅ NEW: Episode Share Route
app.post('/make-server-a278ea32/episode-share', async (c) => {
  try {
    const body = await c.req.json();
    const { episodeId, platform, userId } = body;
    
    console.log('[Episode Share] Tracking share:', { episodeId, platform, userId });
    
    // Create unique share record
    const shareId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shareKey = `episode_share_${episodeId}_${shareId}`;
    
    await kv.set(shareKey, {
      id: shareId,
      episodeId,
      userId: userId || null, // Optional - can be guest
      platform: platform || 'unknown', // e.g., 'twitter', 'facebook', 'copy-link'
      timestamp: new Date().toISOString()
    });
    
    // Count total shares for this episode
    const allShares = await kv.getByPrefix(`episode_share_${episodeId}_`) || [];
    const newCount = allShares.length;
    
    // Update episode metrics
    let metrics = await kv.get(`episode_metrics_${episodeId}`) || {
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      recentUsers: []
    };
    metrics.totalShares = newCount;
    await kv.set(`episode_metrics_${episodeId}`, metrics);
    
    console.log(`[Episode Share] Share tracked successfully. Total shares: ${newCount}`);
    
    return c.json({
      success: true,
      shareCount: newCount
    });
  } catch (error) {
    console.log('Error tracking episode share:', error);
    return c.json({ success: false, error: 'Failed to track share' }, 500);
  }
});

// Episode Comments Routes
app.get('/make-server-a278ea32/episode-comments/:episodeId', async (c) => {
  try {
    const episodeId = c.req.param('episodeId');
    const comments = await kv.getByPrefix(`episode_comment_${episodeId}_`) || [];
    
    // Sort comments by timestamp (newest first)
    const sortedComments = comments
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(comment => ({
        ...comment,
        replies: comment.replies || []
      }));
    
    return c.json({ success: true, comments: sortedComments });
  } catch (error) {
    console.log('Error fetching episode comments:', error);
    return c.json({ success: false, error: 'Failed to fetch comments' }, 500);
  }
});

app.post('/make-server-a278ea32/episode-comments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { episodeId, content, parentId } = body;

    const commentId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const comment = {
      id: commentId,
      episodeId,
      userId: user.id,
      userName: user.user_metadata?.name || user.email,
      userAvatar: user.user_metadata?.avatar_url || '',
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: [],
      isLiked: false,
      parentId: parentId || null
    };

    if (parentId) {
      // This is a reply - add to parent comment
      const parentComment = await kv.get(`episode_comment_${episodeId}_${parentId}`);
      if (parentComment) {
        parentComment.replies = parentComment.replies || [];
        parentComment.replies.push(comment);
        await kv.set(`episode_comment_${episodeId}_${parentId}`, parentComment);
      }
    } else {
      // This is a top-level comment
      await kv.set(`episode_comment_${episodeId}_${commentId}`, comment);
    }

    // Update episode metrics
    const metricsKey = `episode_metrics_${episodeId}`;
    const metrics = await kv.get(metricsKey) || {
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      recentUsers: []
    };
    
    metrics.totalComments += 1;
    
    // Add user to recent users if not already there
    const userExists = metrics.recentUsers.some(u => u.id === user.id);
    if (!userExists) {
      metrics.recentUsers.unshift({
        id: user.id,
        name: user.user_metadata?.name || user.email,
        avatar: user.user_metadata?.avatar_url || ''
      });
      // Keep only last 10 users
      metrics.recentUsers = metrics.recentUsers.slice(0, 10);
    }
    
    await kv.set(metricsKey, metrics);

    return c.json({ success: true, comment });
  } catch (error) {
    console.log('Error posting comment:', error);
    return c.json({ success: false, error: 'Failed to post comment' }, 500);
  }
});

app.post('/make-server-a278ea32/comment-like', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { commentId } = body;

    // Find the comment
    const commentKeys = await kv.getByPrefix('episode_comment_');
    let targetComment = null;
    let commentKey = null;
    
    for (const comment of commentKeys) {
      if (comment.id === commentId) {
        targetComment = comment;
        commentKey = `episode_comment_${comment.episodeId}_${commentId}`;
        break;
      }
      // Check replies
      if (comment.replies) {
        const replyIndex = comment.replies.findIndex(r => r.id === commentId);
        if (replyIndex !== -1) {
          targetComment = comment.replies[replyIndex];
          commentKey = `episode_comment_${comment.episodeId}_${comment.id}`;
          break;
        }
      }
    }

    if (!targetComment) {
      return c.json({ success: false, error: 'Comment not found' }, 404);
    }

    // Check if user already liked this comment
    const likeKey = `comment_like_${commentId}_${user.id}`;
    const existingLike = await kv.get(likeKey);
    
    let isLiked;
    let newCount;
    
    if (existingLike) {
      // Unlike
      await kv.del(likeKey);
      targetComment.likes = Math.max(0, targetComment.likes - 1);
      isLiked = false;
    } else {
      // Like
      await kv.set(likeKey, {
        userId: user.id,
        commentId,
        timestamp: new Date().toISOString()
      });
      targetComment.likes += 1;
      isLiked = true;
    }
    
    newCount = targetComment.likes;
    targetComment.isLiked = isLiked;
    
    // Update the comment
    if (commentKey.includes(commentId)) {
      // Top-level comment
      await kv.set(commentKey, targetComment);
    } else {
      // Reply - update parent comment
      const parentComment = await kv.get(commentKey);
      const replyIndex = parentComment.replies.findIndex(r => r.id === commentId);
      parentComment.replies[replyIndex] = targetComment;
      await kv.set(commentKey, parentComment);
    }

    return c.json({ success: true, isLiked, newCount });
  } catch (error) {
    console.log('Error liking comment:', error);
    return c.json({ success: false, error: 'Failed to like comment' }, 500);
  }
});

app.post('/make-server-a278ea32/comment-share', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { commentId, episodeId } = body;

    // Record the share
    const shareId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`comment_share_${shareId}`, {
      id: shareId,
      commentId,
      episodeId,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Update episode metrics
    const metricsKey = `episode_metrics_${episodeId}`;
    const metrics = await kv.get(metricsKey) || {
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      recentUsers: []
    };
    
    metrics.totalShares += 1;
    await kv.set(metricsKey, metrics);

    return c.json({ success: true });
  } catch (error) {
    console.log('Error recording comment share:', error);
    return c.json({ success: false, error: 'Failed to record share' }, 500);
  }
});

app.post('/make-server-a278ea32/episode-view', async (c) => {
  try {
    const body = await c.req.json();
    const { episodeId, timestamp } = body;

    // Create unique view record with timestamp and IP-based deduplication
    const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const viewId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store individual view record
    await kv.set(`episode_view_${episodeId}_${viewId}`, {
      id: viewId,
      episodeId,
      timestamp,
      clientIP,
      userAgent: c.req.header('user-agent') || 'unknown'
    });

    // Update episode metrics with view count
    const metricsKey = `episode_metrics_${episodeId}`;
    const metrics = await kv.get(metricsKey) || {
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      recentUsers: []
    };
    
    metrics.totalViews += 1;
    await kv.set(metricsKey, metrics);

    return c.json({ success: true, totalViews: metrics.totalViews });
  } catch (error) {
    console.log('Error tracking episode view:', error);
    return c.json({ success: false, error: 'Failed to track view' }, 500);
  }
});

app.get('/make-server-a278ea32/episode-metrics/:episodeId', async (c) => {
  try {
    const episodeId = c.req.param('episodeId');
    const metrics = await kv.get(`episode_metrics_${episodeId}`) || {
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      recentUsers: []
    };
    
    return c.json({ success: true, metrics });
  } catch (error) {
    console.log('Error fetching episode metrics:', error);
    return c.json({ success: false, error: 'Failed to fetch metrics' }, 500);
  }
});

// Spotify API Routes
app.get('/make-server-a278ea32/spotify/episodes', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const showId = Deno.env.get('SPOTIFY_SHOW_ID');

    if (!clientId || !clientSecret || !showId) {
      return c.json({ 
        success: false, 
        error: 'Spotify credentials not configured',
        missing: {
          clientId: !clientId,
          clientSecret: !clientSecret,
          showId: !showId
        }
      }, 500);
    }

    console.log(`[Spotify API] Fetching ${limit} episodes from show: ${showId}`);

    // Get access token using Client Credentials flow
    const auth = btoa(`${clientId}:${clientSecret}`);
    
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Spotify API] Token fetch failed:', errorText);
      return c.json({ success: false, error: `Spotify auth failed: ${tokenResponse.status}` }, 500);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get show episodes
    const episodesResponse = await fetch(
      `https://api.spotify.com/v1/shows/${showId}/episodes?limit=${limit}&offset=${offset}&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!episodesResponse.ok) {
      const errorText = await episodesResponse.text();
      console.error('[Spotify API] Episodes fetch failed:', errorText);
      return c.json({ success: false, error: `Spotify episodes API failed: ${episodesResponse.status}` }, 500);
    }

    const episodesData = await episodesResponse.json();
    const items = episodesData.items || [];

    // Transform to our episode format
    const episodes = items.map(episode => ({
      id: `spotify_${episode.id}`,
      title: episode.name,
      description: episode.description?.replace(/<[^>]*>/g, '').trim() || '',
      audioUrl: episode.audio_preview_url || '', // Note: Spotify only provides 30-second previews
      imageUrl: episode.images?.[0]?.url || '',
      duration: Math.floor(episode.duration_ms / 1000),
      publishedDate: episode.release_date,
      platform: 'spotify',
      platformEpisodeId: episode.id,
      platformUrl: episode.external_urls.spotify,
      isExplicit: episode.explicit,
      guest: undefined, // Could extract from description if needed
      category: 'General',
    }));

    console.log(`[Spotify API] Successfully processed ${episodes.length} episodes`);
    return c.json({ success: true, episodes, totalResults: episodes.length });

  } catch (error) {
    console.error('[Spotify API] Error fetching episodes:', error);
    return c.json({ success: false, error: 'Failed to fetch Spotify episodes' }, 500);
  }
});

app.get('/make-server-a278ea32/spotify/status', (c) => {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  const showId = Deno.env.get('SPOTIFY_SHOW_ID');
  
  return c.json({ 
    success: true, 
    configured: !!(clientId && clientSecret && showId),
    hasClientId: clientId ? `${clientId.length} chars` : 'No key',
    hasClientSecret: clientSecret ? `${clientSecret.length} chars` : 'No key',
    hasShowId: showId ? `${showId.length} chars` : 'No key'
  });
});

// YouTube API Routes
app.get('/make-server-a278ea32/youtube/episodes', async (c) => {
  try {
    const maxResults = parseInt(c.req.query('maxResults') || '50');
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    const playlistId = 'PLJvplLYky1RbiT_dMVrhmZc2_5kPxWVvH';

    if (!apiKey) {
      return c.json({ success: false, error: 'YouTube API key not configured' }, 500);
    }

    console.log(`[YouTube API] Fetching ${maxResults} episodes from playlist: ${playlistId}`);

    // Get playlist items
    const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    playlistUrl.searchParams.set('part', 'snippet');
    playlistUrl.searchParams.set('playlistId', playlistId);
    playlistUrl.searchParams.set('maxResults', maxResults.toString());
    playlistUrl.searchParams.set('key', apiKey);

    const playlistResponse = await fetch(playlistUrl.toString());
    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      console.error('[YouTube API] Playlist fetch failed:', errorText);
      return c.json({ success: false, error: `Playlist API failed: ${playlistResponse.status}` }, 500);
    }

    const playlistData = await playlistResponse.json();
    const videoIds = playlistData.items?.map(item => item.snippet.resourceId.videoId) || [];

    if (videoIds.length === 0) {
      return c.json({ success: true, episodes: [], totalResults: 0 });
    }

    // Get detailed video information
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    videosUrl.searchParams.set('id', videoIds.join(','));
    videosUrl.searchParams.set('key', apiKey);

    const videosResponse = await fetch(videosUrl.toString());
    if (!videosResponse.ok) {
      const errorText = await videosResponse.text();
      console.error('[YouTube API] Videos fetch failed:', errorText);
      return c.json({ success: false, error: `Videos API failed: ${videosResponse.status}` }, 500);
    }

    const videosData = await videosResponse.json();
    const videos = videosData.items || [];

    // Transform to our episode format
    const episodes = videos.map(video => {
      // Parse duration (PT4M13S -> seconds)
      const durationMatch = video.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(durationMatch?.[1] || '0');
      const minutes = parseInt(durationMatch?.[2] || '0');
      const seconds = parseInt(durationMatch?.[3] || '0');
      const durationInSeconds = hours * 3600 + minutes * 60 + seconds;

      // Get best thumbnail
      const thumbnails = video.snippet.thumbnails;
      const imageUrl = thumbnails.maxres?.url || 
                      thumbnails.standard?.url || 
                      thumbnails.high?.url || 
                      thumbnails.medium?.url || 
                      thumbnails.default?.url;

      return {
        id: `youtube_api_${video.id}`,
        title: video.snippet.title,
        description: video.snippet.description?.substring(0, 500) || '',
        audioUrl: `https://www.youtube.com/watch?v=${video.id}`,
        imageUrl,
        duration: durationInSeconds,
        publishedDate: video.snippet.publishedAt,
        platform: 'youtube',
        views: parseInt(video.statistics.viewCount) || 0,
        likes: parseInt(video.statistics.likeCount) || 0,
        comments: parseInt(video.statistics.commentCount) || 0,
        tags: video.snippet.tags || []
      };
    });

    console.log(`[YouTube API] Successfully processed ${episodes.length} episodes`);
    return c.json({ success: true, episodes, totalResults: episodes.length });

  } catch (error) {
    console.error('[YouTube API] Error fetching episodes:', error);
    return c.json({ success: false, error: 'Failed to fetch YouTube episodes' }, 500);
  }
});

app.get('/make-server-a278ea32/youtube/status', (c) => {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  return c.json({ 
    success: true, 
    configured: !!apiKey,
    hasKey: apiKey ? `${apiKey.length} chars` : 'No key'
  });
});

app.post('/make-server-a278ea32/youtube/search', async (c) => {
  try {
    const body = await c.req.json();
    const { query } = body;

    if (!query) {
      return c.json({ success: false, error: 'Search query required' }, 400);
    }

    // For now, get all episodes and filter locally
    // In a production app, you might want to implement proper search via YouTube API
    const episodesResponse = await fetch(`${c.req.header('host')}/functions/v1/make-server-a278ea32/youtube/episodes`, {
      headers: { 'Authorization': c.req.header('Authorization') || '' }
    });

    if (!episodesResponse.ok) {
      return c.json({ success: false, error: 'Failed to fetch episodes for search' }, 500);
    }

    const episodesData = await episodesResponse.json();
    
    if (!episodesData.success) {
      return c.json({ success: false, error: 'Failed to get episodes for search' }, 500);
    }

    const filteredEpisodes = episodesData.episodes.filter(episode =>
      episode.title.toLowerCase().includes(query.toLowerCase()) ||
      episode.description.toLowerCase().includes(query.toLowerCase())
    );

    return c.json({ 
      success: true, 
      episodes: filteredEpisodes, 
      totalResults: filteredEpisodes.length 
    });

  } catch (error) {
    console.error('[YouTube API] Error searching episodes:', error);
    return c.json({ success: false, error: 'Search failed' }, 500);
  }
});

// Podcast Platform API Routes
app.get('/make-server-a278ea32/podcast/sync-all', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    console.log('Starting podcast sync all platforms with optimized timeout handling...');

    try {
      // Import server-specific podcast orchestrator
      const { podcastAPIOrchestrator } = await import('./podcastOrchestrator.ts');
      console.log('Server podcast orchestrator imported successfully');
      
      const results = await podcastAPIOrchestrator.syncAllPlatforms();
      console.log('Sync all platforms completed successfully:', {
        platforms: results.results.map(r => `${r.platform}: ${r.success ? 'success' : 'failed'}`),
        totalEpisodes: results.allEpisodes.length
      });
      
      return c.json({
        success: true,
        data: results,
        message: `Successfully synced ${results.results.filter(r => r.success).length}/3 platforms`,
        timestamp: new Date().toISOString()
      });
    } catch (importError) {
      console.error('Error importing or running podcast orchestrator:', importError);
      
      // Fallback: try to sync each platform individually with reduced timeout
      console.log('Attempting optimized fallback individual platform sync...');
      
      const results = [];
      
      // Try Spotify with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const spotifyResponse = await fetch(`https://${c.req.header('host')}/functions/v1/make-server-a278ea32/podcast/spotify/episodes?limit=5`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (spotifyResponse.ok) {
          const spotifyData = await spotifyResponse.json();
          results.push({
            platform: 'spotify',
            success: true,
            episodes: spotifyData.data?.items?.slice(0, 5) || [],
            stats: {}
          });
        } else {
          results.push({
            platform: 'spotify',
            success: false,
            episodes: [],
            error: `HTTP ${spotifyResponse.status}`
          });
        }
      } catch (spotifyError) {
        console.error('Spotify fallback failed:', spotifyError);
        results.push({
          platform: 'spotify',
          success: false,
          episodes: [],
          error: spotifyError instanceof Error ? spotifyError.message : 'Timeout or unknown error'
        });
      }
      
      // Try YouTube with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const youtubeResponse = await fetch(`https://${c.req.header('host')}/functions/v1/make-server-a278ea32/podcast/youtube/videos?maxResults=5`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json();
          results.push({
            platform: 'youtube',
            success: true,
            episodes: youtubeData.data?.videoDetails?.items?.slice(0, 5) || [],
            stats: {}
          });
        } else {
          results.push({
            platform: 'youtube',
            success: false,
            episodes: [],
            error: `HTTP ${youtubeResponse.status}`
          });
        }
      } catch (youtubeError) {
        console.error('YouTube fallback failed:', youtubeError);
        results.push({
          platform: 'youtube',
          success: false,
          episodes: [],
          error: youtubeError instanceof Error ? youtubeError.message : 'Timeout or unknown error'
        });
      }
      
      // Try Apple with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const appleResponse = await fetch(`https://${c.req.header('host')}/functions/v1/make-server-a278ea32/podcast/apple/episodes`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (appleResponse.ok) {
          const appleData = await appleResponse.json();
          results.push({
            platform: 'apple',
            success: true,
            episodes: appleData.data?.results?.slice(0, 5) || [],
            stats: {}
          });
        } else {
          results.push({
            platform: 'apple',
            success: false,
            episodes: [],
            error: `HTTP ${appleResponse.status}`
          });
        }
      } catch (appleError) {
        console.error('Apple fallback failed:', appleError);
        results.push({
          platform: 'apple',
          success: false,
          episodes: [],
          error: appleError instanceof Error ? appleError.message : 'Timeout or unknown error'
        });
      }
      
      console.log('Fallback sync completed with results:', results.map(r => `${r.platform}: ${r.success ? 'success' : r.error}`));
      
      return c.json({
        success: true,
        data: {
          results: results,
          allEpisodes: results.flatMap(r => r.episodes),
          platformStats: {
            spotify: { isConnected: results[0]?.success || false, totalEpisodes: results[0]?.episodes.length || 0 },
            youtube: { isConnected: results[1]?.success || false, totalEpisodes: results[1]?.episodes.length || 0 },
            apple: { isConnected: results[2]?.success || false, totalEpisodes: results[2]?.episodes.length || 0 }
          }
        },
        fallback: true,
        importError: importError instanceof Error ? importError.message : 'Unknown import error',
        message: `Fallback sync completed - ${results.filter(r => r.success).length}/3 platforms successful`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error syncing all platforms:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to sync platforms',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/make-server-a278ea32/podcast/sync/:platform', async (c) => {
  try {
    const platform = c.req.param('platform');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator === true;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const { podcastAPIOrchestrator } = await import('./podcastOrchestrator.ts');
    
    let result;
    switch (platform) {
      case 'spotify':
        result = await podcastAPIOrchestrator.syncSpotify();
        break;
      case 'apple':
        result = await podcastAPIOrchestrator.syncApplePodcasts();
        break;
      case 'youtube':
        result = await podcastAPIOrchestrator.syncYouTube();
        break;
      default:
        return c.json({ success: false, error: 'Invalid platform' }, 400);
    }
    
    return c.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log(`Error syncing ${c.req.param('platform')} platform:`, error);
    return c.json({ 
      success: false, 
      error: `Failed to sync ${c.req.param('platform')} platform`,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/make-server-a278ea32/podcast/episodes', async (c) => {
  try {
    const platform = c.req.query('platform');
    const limit = parseInt(c.req.query('limit') || '50');
    
    if (platform && !['spotify', 'apple', 'youtube'].includes(platform)) {
      return c.json({ success: false, error: 'Invalid platform' }, 400);
    }

    const { podcastAPIOrchestrator } = await import('./podcastOrchestrator.ts');
    
    let episodes;
    if (platform) {
      // Get episodes from specific platform
      let result;
      switch (platform) {
        case 'spotify':
          result = await podcastAPIOrchestrator.syncSpotify();
          break;
        case 'apple':
          result = await podcastAPIOrchestrator.syncApplePodcasts();
          break;
        case 'youtube':
          result = await podcastAPIOrchestrator.syncYouTube();
          break;
        default:
          return c.json({ success: false, error: 'Invalid platform' }, 400);
      }
      episodes = result.episodes.slice(0, limit);
    } else {
      const { allEpisodes } = await podcastAPIOrchestrator.syncAllPlatforms();
      episodes = allEpisodes.slice(0, limit);
    }
    
    return c.json({
      success: true,
      data: episodes,
      count: episodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('Error fetching episodes:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch episodes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/make-server-a278ea32/podcast/search', async (c) => {
  try {
    const query = c.req.query('q');
    const limit = parseInt(c.req.query('limit') || '20');
    
    if (!query) {
      return c.json({ success: false, error: 'Search query required' }, 400);
    }

    // For now, get all episodes and filter by title/description
    // In a production app, you'd implement proper search for each platform
    const { podcastAPIOrchestrator } = await import('./podcastOrchestrator.ts');
    
    const { allEpisodes } = await podcastAPIOrchestrator.syncAllPlatforms();
    
    // Simple text search
    const searchResults = allEpisodes.filter(episode => 
      episode.title.toLowerCase().includes(query.toLowerCase()) ||
      episode.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
    
    return c.json({
      success: true,
      data: searchResults,
      query: query,
      count: searchResults.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('Error searching episodes:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to search episodes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/make-server-a278ea32/podcast/config-status', async (c) => {
  try {
    console.log('Loading podcast config status...');
    
    // Check environment variables directly first
    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const spotifyShowId = Deno.env.get('SPOTIFY_SHOW_ID');
    const appleShowId = Deno.env.get('APPLE_PODCASTS_SHOW_ID');
    const appleFeedUrl = Deno.env.get('APPLE_PODCASTS_FEED_URL');
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    const youtubeChannelId = Deno.env.get('YOUTUBE_CHANNEL_ID');
    const youtubePlaylistId = Deno.env.get('YOUTUBE_PLAYLIST_ID');
    
    console.log('Environment variables check:', {
      spotifyClientId: !!spotifyClientId,
      spotifyClientSecret: !!spotifyClientSecret,
      spotifyShowId: !!spotifyShowId,
      appleShowId: !!appleShowId,
      appleFeedUrl: !!appleFeedUrl,
      youtubeApiKey: !!youtubeApiKey,
      youtubeChannelId: !!youtubeChannelId,
      youtubePlaylistId: !!youtubePlaylistId
    });

    let configStatus;
    try {
      const { podcastAPIOrchestrator } = await import('./podcastOrchestrator.ts');
      // For the server version, we'll calculate the status directly
      configStatus = {
        spotify: Boolean(spotifyClientId && spotifyClientSecret && spotifyShowId),
        apple: Boolean(appleShowId || appleFeedUrl),
        youtube: Boolean(youtubeApiKey && youtubeChannelId)
      };
      console.log('Configuration status calculated:', configStatus);
    } catch (importError) {
      console.log('Error importing podcast orchestrator:', importError);
      // Fallback to manual calculation
      configStatus = {
        spotify: Boolean(spotifyClientId && spotifyClientSecret && spotifyShowId),
        apple: Boolean(appleShowId || appleFeedUrl),
        youtube: Boolean(youtubeApiKey && youtubeChannelId)
      };
    }
    
    const response = {
      success: true,
      data: {
        spotify: {
          configured: configStatus.spotify,
          hasClientId: Boolean(spotifyClientId),
          hasClientSecret: Boolean(spotifyClientSecret),
          hasShowId: Boolean(spotifyShowId)
        },
        apple: {
          configured: configStatus.apple,
          hasShowId: Boolean(appleShowId),
          hasFeedUrl: Boolean(appleFeedUrl)
        },
        youtube: {
          configured: configStatus.youtube,
          hasApiKey: Boolean(youtubeApiKey),
          hasChannelId: Boolean(youtubeChannelId),
          hasPlaylistId: Boolean(youtubePlaylistId)
        }
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending config status response:', response);
    return c.json(response);
  } catch (error) {
    console.log('Error checking config status:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to check configuration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Direct Spotify API Route
app.get('/make-server-a278ea32/podcast/spotify/episodes', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const showId = Deno.env.get('SPOTIFY_SHOW_ID');
    
    console.log('Spotify API Test - Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasShowId: !!showId,
      showIdValue: showId, // Log the actual value for debugging
      clientIdLength: clientId?.length || 0
    });
    
    if (!clientId || !clientSecret || !showId) {
      return c.json({ 
        success: false, 
        error: 'Spotify API credentials not configured',
        missing: {
          clientId: !clientId,
          clientSecret: !clientSecret,
          showId: !showId
        }
      }, 400);
    }

    console.log('Spotify API Test - Getting access token...');
    
    // Get Spotify access token
    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    console.log('Spotify Auth Response:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Spotify auth failed:', errorText);
      throw new Error(`Spotify auth failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    console.log('Spotify API Test - Access token received, fetching episodes...');
    console.log('Show ID being used:', showId);

    // Get episodes
    const episodesResponse = await fetch(
      `https://api.spotify.com/v1/shows/${showId}/episodes?limit=${limit}&offset=${offset}&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Spotify Episodes Response:', {
      status: episodesResponse.status,
      statusText: episodesResponse.statusText,
      ok: episodesResponse.ok,
      url: `https://api.spotify.com/v1/shows/${showId}/episodes?limit=${limit}&offset=${offset}&market=US`
    });

    if (!episodesResponse.ok) {
      const errorText = await episodesResponse.text();
      console.error('Spotify episodes API failed:', errorText);
      
      // Handle specific error codes
      if (episodesResponse.status === 404) {
        throw new Error(`Spotify show not found. Please verify your Show ID: ${showId}`);
      } else if (episodesResponse.status === 403) {
        throw new Error(`Access forbidden. Check if the show is available in the US market or if your app has the correct scopes.`);
      } else {
        throw new Error(`Spotify episodes API failed: ${episodesResponse.status} - ${errorText}`);
      }
    }

    const episodesData = await episodesResponse.json();
    
    console.log('Spotify API Test - Success! Episodes found:', episodesData?.items?.length || 0);
    
    return c.json({
      success: true,
      data: episodesData,
      platform: 'spotify',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Spotify episodes:', error);
    return c.json({ 
      success: false, 
      error: `Failed to fetch Spotify episodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Direct YouTube API Route
app.get('/make-server-a278ea32/podcast/youtube/videos', async (c) => {
  try {
    const maxResults = parseInt(c.req.query('maxResults') || '50');
    const pageToken = c.req.query('pageToken');
    
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    const channelId = Deno.env.get('YOUTUBE_CHANNEL_ID');
    
    if (!apiKey || !channelId) {
      return c.json({ 
        success: false, 
        error: 'YouTube API credentials not configured',
        missing: {
          apiKey: !apiKey,
          channelId: !channelId
        }
      }, 400);
    }

    // Get channel videos
    const searchParams = new URLSearchParams({
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      order: 'date',
      maxResults: maxResults.toString(),
      key: apiKey
    });

    if (pageToken) {
      searchParams.append('pageToken', pageToken);
    }

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    );

    if (!searchResponse.ok) {
      throw new Error(`YouTube search API failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return c.json({
        success: true,
        data: { items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } },
        platform: 'youtube',
        timestamp: new Date().toISOString()
      });
    }

    // Get detailed video information
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    const videosParams = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoIds,
      key: apiKey
    });

    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${videosParams.toString()}`
    );

    if (!videosResponse.ok) {
      throw new Error(`YouTube videos API failed: ${videosResponse.status}`);
    }

    const videosData = await videosResponse.json();
    
    return c.json({
      success: true,
      data: {
        searchResults: searchData,
        videoDetails: videosData
      },
      platform: 'youtube',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log('Error fetching YouTube videos:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch YouTube videos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Apple Podcasts RSS Feed Route
app.get('/make-server-a278ea32/podcast/apple/episodes', async (c) => {
  try {
    const showId = Deno.env.get('APPLE_PODCASTS_SHOW_ID');
    const feedUrl = Deno.env.get('APPLE_PODCASTS_FEED_URL');
    
    if (!showId && !feedUrl) {
      return c.json({ 
        success: false, 
        error: 'Apple Podcasts configuration not found',
        missing: {
          showId: !showId,
          feedUrl: !feedUrl
        }
      }, 400);
    }

    // If we have RSS feed URL, fetch from that
    if (feedUrl) {
      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`RSS feed fetch failed: ${response.status}`);
      }
      
      const rssText = await response.text();
      return c.json({
        success: true,
        data: { rssContent: rssText },
        platform: 'apple',
        source: 'rss',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise use iTunes Search API
    if (showId) {
      const searchParams = new URLSearchParams({
        id: showId,
        media: 'podcast',
        entity: 'podcastEpisode',
        limit: '50'
      });

      const response = await fetch(`https://itunes.apple.com/search?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`iTunes API failed: ${response.status}`);
      }
      
      const data = await response.json();
      return c.json({
        success: true,
        data: data,
        platform: 'apple',
        source: 'itunes',
        timestamp: new Date().toISOString()
      });
    }
    
    return c.json({ 
      success: false, 
      error: 'No valid Apple Podcasts configuration found'
    }, 400);
    
  } catch (error) {
    console.log('Error fetching Apple Podcasts episodes:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch Apple Podcasts episodes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Add a simple Spotify show verification endpoint
app.get('/make-server-a278ea32/podcast/spotify/verify-show', async (c) => {
  try {
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const showId = Deno.env.get('SPOTIFY_SHOW_ID');
    
    console.log('Spotify Show Verification - Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasShowId: !!showId,
      showIdValue: showId
    });
    
    if (!clientId || !clientSecret || !showId) {
      return c.json({ 
        success: false, 
        error: 'Spotify API credentials not configured'
      }, 400);
    }

    // Get Spotify access token
    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Spotify auth failed:', errorText);
      return c.json({ 
        success: false, 
        error: `Spotify auth failed: ${tokenResponse.status} - ${errorText}`
      }, 500);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Try to get show information first (simpler than episodes)
    const showResponse = await fetch(
      `https://api.spotify.com/v1/shows/${showId}?market=US`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Spotify Show Verification Response:', {
      status: showResponse.status,
      statusText: showResponse.statusText,
      ok: showResponse.ok,
      url: `https://api.spotify.com/v1/shows/${showId}?market=US`
    });

    if (!showResponse.ok) {
      const errorText = await showResponse.text();
      console.error('Spotify show verification failed:', errorText);
      
      return c.json({
        success: false,
        error: `Show verification failed: ${showResponse.status} - ${errorText}`,
        showId: showId,
        details: errorText
      }, showResponse.status);
    }

    const showData = await showResponse.json();
    
    console.log('Spotify Show Verification - Success! Show found:', showData.name);
    
    return c.json({
      success: true,
      showInfo: {
        id: showData.id,
        name: showData.name,
        description: showData.description,
        totalEpisodes: showData.total_episodes,
        publisher: showData.publisher,
        explicit: showData.explicit,
        languages: showData.languages
      },
      message: 'Show verification successful!'
    });
  } catch (error) {
    console.error('Error verifying Spotify show:', error);
    return c.json({ 
      success: false, 
      error: `Failed to verify Spotify show: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
  }
});

// Debug endpoint to check environment variables (REMOVE IN PRODUCTION)
app.get('/make-server-a278ea32/debug/env-check', async (c) => {
  try {
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const showId = Deno.env.get('SPOTIFY_SHOW_ID');
    
    return c.json({
      success: true,
      credentials: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasShowId: !!showId,
        clientIdLength: clientId?.length || 0,
        clientSecretLength: clientSecret?.length || 0,
        showIdLength: showId?.length || 0,
        // Show first/last 4 characters for debugging (safely)
        clientIdPreview: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : 'not set',
        showIdValue: showId || 'not set' // Show ID is safe to display
      }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// VIP/Exclusive Content Management Routes
app.post('/make-server-a278ea32/admin/episodes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const body = await c.req.json();
    const episodeData = {
      ...body,
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store the episode
    await kv.set(`admin_episode_${episodeData.id}`, episodeData);

    // If it's VIP only, also store in VIP index
    if (episodeData.isVipOnly) {
      const vipIndex = await kv.get('vip_episodes_index') || [];
      vipIndex.push(episodeData.id);
      await kv.set('vip_episodes_index', vipIndex);
    }

    console.log('Created admin episode:', episodeData.id);
    return c.json({ success: true, data: episodeData });
  } catch (error) {
    console.log('Error creating admin episode:', error);
    return c.json({ success: false, error: 'Failed to create episode' }, 500);
  }
});

app.get('/make-server-a278ea32/admin/episodes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get all admin episodes
    const episodes = await kv.getByPrefix('admin_episode_') || [];
    
    // Sort by creation date (newest first)
    episodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ success: true, data: episodes });
  } catch (error) {
    console.log('Error fetching admin episodes:', error);
    return c.json({ success: false, error: 'Failed to fetch episodes' }, 500);
  }
});

app.get('/make-server-a278ea32/episodes/exclusive', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    // For VIP content, we need authenticated user
    if (!accessToken) {
      return c.json({ success: false, error: 'Authentication required for exclusive content' }, 401);
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Invalid authentication' }, 401);
    }

    // Check if user has VIP access (you can implement your VIP logic here)
    // For now, we'll allow all authenticated users to see exclusive content
    const isVip = user.user_metadata?.vipStatus === 'active' || 
                  user.user_metadata?.role === 'admin' || 
                  user.user_metadata?.isCreator;

    if (!isVip) {
      return c.json({ success: false, error: 'VIP membership required' }, 403);
    }

    // Get VIP episodes index
    const vipIndex = await kv.get('vip_episodes_index') || [];
    
    // Fetch all VIP episodes
    const vipEpisodes = [];
    for (const episodeId of vipIndex) {
      const episode = await kv.get(`admin_episode_${episodeId}`);
      if (episode && episode.isVipOnly && episode.status === 'published') {
        vipEpisodes.push(episode);
      }
    }

    // Sort by publication date (newest first)
    vipEpisodes.sort((a, b) => new Date(b.publishedDate || b.createdAt).getTime() - new Date(a.publishedDate || a.createdAt).getTime());
    
    return c.json({ success: true, data: vipEpisodes, isVip: true });
  } catch (error) {
    console.log('Error fetching exclusive episodes:', error);
    return c.json({ success: false, error: 'Failed to fetch exclusive content' }, 500);
  }
});

app.put('/make-server-a278ea32/admin/episodes/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const episodeId = c.req.param('id');
    const body = await c.req.json();
    
    // Get existing episode
    const existingEpisode = await kv.get(`admin_episode_${episodeId}`);
    if (!existingEpisode) {
      return c.json({ success: false, error: 'Episode not found' }, 404);
    }

    // Update episode data
    const updatedEpisode = {
      ...existingEpisode,
      ...body,
      updatedAt: new Date().toISOString()
    };

    // Store updated episode
    await kv.set(`admin_episode_${episodeId}`, updatedEpisode);

    // Update VIP index if VIP status changed
    const vipIndex = await kv.get('vip_episodes_index') || [];
    const isInVipIndex = vipIndex.includes(episodeId);
    
    if (updatedEpisode.isVipOnly && !isInVipIndex) {
      vipIndex.push(episodeId);
      await kv.set('vip_episodes_index', vipIndex);
    } else if (!updatedEpisode.isVipOnly && isInVipIndex) {
      const newIndex = vipIndex.filter(id => id !== episodeId);
      await kv.set('vip_episodes_index', newIndex);
    }

    console.log('Updated admin episode:', episodeId);
    return c.json({ success: true, data: updatedEpisode });
  } catch (error) {
    console.log('Error updating admin episode:', error);
    return c.json({ success: false, error: 'Failed to update episode' }, 500);
  }
});

app.delete('/make-server-a278ea32/admin/episodes/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const episodeId = c.req.param('id');
    
    // Delete the episode
    await kv.del(`admin_episode_${episodeId}`);

    // Remove from VIP index
    const vipIndex = await kv.get('vip_episodes_index') || [];
    const newIndex = vipIndex.filter(id => id !== episodeId);
    await kv.set('vip_episodes_index', newIndex);

    console.log('Deleted admin episode:', episodeId);
    return c.json({ success: true, message: 'Episode deleted successfully' });
  } catch (error) {
    console.log('Error deleting admin episode:', error);
    return c.json({ success: false, error: 'Failed to delete episode' }, 500);
  }
});

// Live Sessions Management Routes
app.get('/make-server-a278ea32/live-sessions', async (c) => {
  try {
    const type = c.req.query('type'); // upcoming, ongoing, archived
    
    if (type) {
      // Get sessions of specific type
      const sessions = await kv.getByPrefix(`live_session_${type}_`) || [];
      return c.json({ success: true, data: sessions });
    } else {
      // Get all sessions grouped by type
      const [upcoming, ongoing, archived] = await Promise.all([
        kv.getByPrefix('live_session_upcoming_') || [],
        kv.getByPrefix('live_session_ongoing_') || [],
        kv.getByPrefix('live_session_archived_') || []
      ]);
      
      return c.json({
        success: true,
        data: {
          upcoming,
          ongoing,
          archived
        }
      });
    }
  } catch (error) {
    console.log('Error fetching live sessions:', error);
    return c.json({ success: false, error: 'Failed to fetch live sessions' }, 500);
  }
});

app.post('/make-server-a278ea32/live-sessions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const body = await c.req.json();
    const sessionData = {
      ...body,
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hostId: user.id,
      hostName: user.user_metadata?.name || user.email,
      hostImage: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1615411836704-2c1636331bc2?w=300&h=200&fit=crop',
      createdAt: new Date().toISOString(),
      viewerCount: 0,
      isLive: body.isLive || false,
      hasReminder: false
    };

    // Determine session type (default to upcoming)
    const sessionType = sessionData.type || 'upcoming';
    
    // Store the session
    await kv.set(`live_session_${sessionType}_${sessionData.id}`, sessionData);

    console.log('Created live session:', sessionData.id);
    return c.json({ success: true, data: sessionData });
  } catch (error) {
    console.log('Error creating live session:', error);
    return c.json({ success: false, error: 'Failed to create live session' }, 500);
  }
});

app.put('/make-server-a278ea32/live-sessions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const sessionId = c.req.param('id');
    const body = await c.req.json();
    
    // Find existing session across all types
    let existingSession = null;
    let sessionKey = '';
    const types = ['upcoming', 'ongoing', 'archived'];
    
    for (const type of types) {
      const key = `live_session_${type}_${sessionId}`;
      const session = await kv.get(key);
      if (session) {
        existingSession = session;
        sessionKey = key;
        break;
      }
    }
    
    if (!existingSession) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    // Update session data
    const updatedSession = {
      ...existingSession,
      ...body,
      updatedAt: new Date().toISOString()
    };

    // If the type changed, move the session
    const newType = body.type || existingSession.type;
    const oldType = sessionKey.split('_')[2]; // Extract type from key
    
    if (newType !== oldType) {
      // Delete from old location
      await kv.del(sessionKey);
      // Store in new location
      await kv.set(`live_session_${newType}_${sessionId}`, updatedSession);
    } else {
      // Update in same location
      await kv.set(sessionKey, updatedSession);
    }

    console.log('Updated live session:', sessionId);
    return c.json({ success: true, data: updatedSession });
  } catch (error) {
    console.log('Error updating live session:', error);
    return c.json({ success: false, error: 'Failed to update live session' }, 500);
  }
});

app.delete('/make-server-a278ea32/live-sessions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const sessionId = c.req.param('id');
    
    // Find and delete session across all types
    const types = ['upcoming', 'ongoing', 'archived'];
    let deleted = false;
    
    for (const type of types) {
      const key = `live_session_${type}_${sessionId}`;
      const session = await kv.get(key);
      if (session) {
        await kv.del(key);
        deleted = true;
        break;
      }
    }
    
    if (!deleted) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    console.log('Deleted live session:', sessionId);
    return c.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.log('Error deleting live session:', error);
    return c.json({ success: false, error: 'Failed to delete live session' }, 500);
  }
});

// Live Session Chat Routes
app.get('/make-server-a278ea32/chat/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const messages = await kv.getByPrefix(`chat_message_${sessionId}_`) || [];
    
    // Sort messages by timestamp
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return c.json({ success: true, data: sortedMessages });
  } catch (error) {
    console.log('Error fetching chat messages:', error);
    return c.json({ success: false, error: 'Failed to fetch chat messages' }, 500);
  }
});

app.post('/make-server-a278ea32/chat/:sessionId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    const { message, isSuperChat = false, superChatAmount = 0 } = body;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      id: messageId,
      sessionId,
      userId: user.id,
      userName: user.user_metadata?.name || user.email,
      userAvatar: user.user_metadata?.avatar_url || '',
      message,
      timestamp: new Date().toISOString(),
      reactions: [],
      isPinned: false,
      isHidden: false,
      isSuperChat,
      superChatAmount
    };

    await kv.set(`chat_message_${sessionId}_${messageId}`, messageData);

    console.log('Sent chat message:', messageId);
    return c.json({ success: true, data: messageData });
  } catch (error) {
    console.log('Error sending chat message:', error);
    return c.json({ success: false, error: 'Failed to send chat message' }, 500);
  }
});

app.post('/make-server-a278ea32/chat/:sessionId/:messageId/react', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const sessionId = c.req.param('sessionId');
    const messageId = c.req.param('messageId');
    const { emoji } = await c.req.json();

    const messageKey = `chat_message_${sessionId}_${messageId}`;
    const message = await kv.get(messageKey);
    
    if (!message) {
      return c.json({ success: false, error: 'Message not found' }, 404);
    }

    // Add or update reaction
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      existingReaction.count += 1;
    } else {
      message.reactions.push({ emoji, count: 1 });
    }

    await kv.set(messageKey, message);
    return c.json({ success: true, data: message });
  } catch (error) {
    console.log('Error adding reaction:', error);
    return c.json({ success: false, error: 'Failed to add reaction' }, 500);
  }
});

app.post('/make-server-a278ea32/chat/:sessionId/:messageId/moderate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const sessionId = c.req.param('sessionId');
    const messageId = c.req.param('messageId');
    const { action } = await c.req.json(); // pin, hide, unpin, unhide

    const messageKey = `chat_message_${sessionId}_${messageId}`;
    const message = await kv.get(messageKey);
    
    if (!message) {
      return c.json({ success: false, error: 'Message not found' }, 404);
    }

    // Apply moderation action
    switch (action) {
      case 'pin':
        message.isPinned = true;
        break;
      case 'unpin':
        message.isPinned = false;
        break;
      case 'hide':
        message.isHidden = true;
        break;
      case 'unhide':
        message.isHidden = false;
        break;
      default:
        return c.json({ success: false, error: 'Invalid moderation action' }, 400);
    }

    await kv.set(messageKey, message);
    return c.json({ success: true, data: message });
  } catch (error) {
    console.log('Error moderating message:', error);
    return c.json({ success: false, error: 'Failed to moderate message' }, 500);
  }
});

// Clear live session data
app.post('/make-server-a278ea32/clear-live-data', async (c) => {
  try {
    console.log('🧹 Clearing all live session data...');
    const types = ['upcoming', 'ongoing', 'archived'];
    let totalDeleted = 0;
    
    for (const type of types) {
      const sessions = await kv.getByPrefix(`live_session_${type}_`) || [];
      console.log(`Found ${sessions.length} ${type} sessions to delete`);
      
      for (const session of sessions) {
        await kv.del(`live_session_${type}_${session.id}`);
        totalDeleted++;
      }
    }
    
    console.log(`✅ Cleared ${totalDeleted} live sessions total`);
    return c.json({ 
      success: true, 
      message: `Mock live sessions cleared successfully - ${totalDeleted} sessions deleted` 
    });
  } catch (error) {
    console.log('❌ Error clearing live session data:', error);
    return c.json({ success: false, error: 'Failed to clear data' }, 500);
  }
});

// Legacy endpoint - deprecated but kept for compatibility
app.post('/make-server-a278ea32/add-test-session', async (c) => {
  try {
    console.log('⚠️ Legacy /add-test-session endpoint called - this endpoint is deprecated');
    console.log('💡 No action taken - test sessions should be created through the admin dashboard');
    
    return c.json({ 
      success: true, 
      message: 'Legacy endpoint - no action taken. Create sessions through the admin dashboard.',
      deprecated: true
    });
  } catch (error) {
    console.log('Error in legacy endpoint:', error);
    return c.json({ success: true, message: 'Legacy endpoint handled' });
  }
});

// Upload live session image endpoint
app.post('/make-server-a278ea32/upload-live-session-image', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin/creator
    const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.isCreator;
    if (!isAdmin) {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file || !fileName) {
      return c.json({ success: false, error: 'File and filename are required' }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ success: false, error: 'Invalid file type. Only images are allowed.' }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File size must be less than 5MB' }, 400);
    }

    console.log('Uploading live session image:', fileName, 'Size:', file.size);

    // Create bucket if it doesn't exist
    const bucketName = 'make-a278ea32-live-sessions';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('Creating live sessions bucket...');
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return c.json({ success: false, error: 'Failed to create storage bucket' }, 500);
      }
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ success: false, error: 'Failed to upload image' }, 500);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!publicData?.publicUrl) {
      return c.json({ success: false, error: 'Failed to get public URL' }, 500);
    }

    // Create signed URL for private access
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

    const finalUrl = signedData?.signedUrl || publicData.publicUrl;

    console.log('Live session image uploaded successfully:', fileName);
    
    return c.json({ 
      success: true, 
      data: { 
        path: uploadData.path,
        publicUrl: finalUrl,
        fileName 
      } 
    });
  } catch (error) {
    console.error('Error uploading live session image:', error);
    return c.json({ success: false, error: 'Failed to upload image' }, 500);
  }
});

// ===============================
// COMMUNITY ENDPOINTS
// ===============================

// Helper function to check if user is admin
const isAdmin = (user: any) => {
  return user.user_metadata?.role === 'admin' || 
         user.email === 'admin@oriri.com' ||
         user.user_metadata?.isAdmin === true;
};

// Helper function to check if user is creator
const isCreator = (user: any) => {
  return isAdmin(user) || user.user_metadata?.isCreator === true;
};

// Helper function to generate community analytics
const generateCommunityAnalytics = async () => {
  try {
    // Get all posts
    const posts = await kv.getByPrefix('community_post_') || [];
    const submissions = await kv.getByPrefix('community_submission_') || [];
    const users = await kv.getByPrefix('community_profile_') || [];
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Calculate current week metrics
    const postsThisWeek = posts.filter(post => new Date(post.createdAt) > weekAgo).length;
    const newMembersThisWeek = users.filter(user => new Date(user.joinedAt || user.createdAt) > weekAgo).length;
    const activeMembers = users.filter(user => {
      const lastActive = new Date(user.lastActive || user.createdAt);
      return lastActive > weekAgo;
    }).length;
    
    // Calculate previous week metrics for comparison
    const postsLastWeek = posts.filter(post => {
      const createdAt = new Date(post.createdAt);
      return createdAt > twoWeeksAgo && createdAt <= weekAgo;
    }).length;
    
    const newMembersLastWeek = users.filter(user => {
      const joinedAt = new Date(user.joinedAt || user.createdAt);
      return joinedAt > twoWeeksAgo && joinedAt <= weekAgo;
    }).length;
    
    const activeMembersLastWeek = users.filter(user => {
      const lastActive = new Date(user.lastActive || user.createdAt);
      return lastActive > twoWeeksAgo && lastActive <= weekAgo;
    }).length;
    
    // Calculate engagement rate (this week)
    const postsThisWeekData = posts.filter(post => new Date(post.createdAt) > weekAgo);
    const thisWeekLikes = postsThisWeekData.reduce((sum, post) => sum + (post.engagement?.likes || 0), 0);
    const thisWeekViews = postsThisWeekData.reduce((sum, post) => sum + (post.engagement?.views || 0), 0);
    const engagementRate = thisWeekViews > 0 ? Math.round((thisWeekLikes / thisWeekViews) * 100 * 100) / 100 : 0;
    
    // Calculate engagement rate (last week)
    const postsLastWeekData = posts.filter(post => {
      const createdAt = new Date(post.createdAt);
      return createdAt > twoWeeksAgo && createdAt <= weekAgo;
    });
    const lastWeekLikes = postsLastWeekData.reduce((sum, post) => sum + (post.engagement?.likes || 0), 0);
    const lastWeekViews = postsLastWeekData.reduce((sum, post) => sum + (post.engagement?.views || 0), 0);
    const lastWeekEngagementRate = lastWeekViews > 0 ? Math.round((lastWeekLikes / lastWeekViews) * 100 * 100) / 100 : 0;
    
    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    };
    
    // Calculate real tag frequencies from posts
    const tagCounts = new Map<string, number>();
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    const popularTopics = Array.from(tagCounts.entries())
      .map(([tag, count]) => {
        // Check if trending (more posts in last week than previous week)
        const recentCount = posts.filter(p => {
          const isRecent = new Date(p.createdAt) > weekAgo;
          return isRecent && p.tags && p.tags.includes(tag);
        }).length;
        const olderCount = posts.filter(p => {
          const createdAt = new Date(p.createdAt);
          const isOlder = createdAt > twoWeeksAgo && createdAt <= weekAgo;
          return isOlder && p.tags && p.tags.includes(tag);
        }).length;
        
        return {
          tag,
          count,
          trending: recentCount > olderCount
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Build real membership growth data (last 30 days)
    const membershipGrowth = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const newMembers = users.filter(user => {
        const joinedAt = new Date(user.joinedAt || user.createdAt);
        return joinedAt >= date && joinedAt < nextDate;
      }).length;
      
      const totalMembers = users.filter(user => {
        const joinedAt = new Date(user.joinedAt || user.createdAt);
        return joinedAt < nextDate;
      }).length;
      
      return {
        date: date.toISOString(),
        newMembers,
        totalMembers
      };
    });
    
    // Build real engagement metrics (last 7 days)
    const engagementMetrics = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const dayPosts = posts.filter(post => {
        const createdAt = new Date(post.createdAt);
        return createdAt >= date && createdAt < nextDate;
      });
      
      return {
        date: date.toISOString(),
        posts: dayPosts.length,
        replies: dayPosts.reduce((sum, post) => sum + (post.engagement?.replies || 0), 0),
        likes: dayPosts.reduce((sum, post) => sum + (post.engagement?.likes || 0), 0),
        views: dayPosts.reduce((sum, post) => sum + (post.engagement?.views || 0), 0)
      };
    });
    
    return {
      totalMembers: users.length,
      activeMembers,
      newMembersThisWeek,
      postsThisWeek,
      repliesThisWeek: posts.filter(post => new Date(post.createdAt) > weekAgo).reduce((sum, post) => sum + (post.engagement?.replies || 0), 0),
      engagementRate,
      // Week-over-week changes
      weekOverWeekChanges: {
        totalMembers: calculateChange(users.length, users.length - newMembersThisWeek),
        newMembers: calculateChange(newMembersThisWeek, newMembersLastWeek),
        posts: calculateChange(postsThisWeek, postsLastWeek),
        activeMembers: calculateChange(activeMembers, activeMembersLastWeek),
        engagementRate: calculateChange(engagementRate, lastWeekEngagementRate)
      },
      topContributors: users
        .map(user => ({
          userId: user.userId || user.id,
          userName: user.displayName || user.name,
          contributions: user.stats?.postsCount || 0,
          type: 'posts' as const
        }))
        .sort((a, b) => b.contributions - a.contributions)
        .slice(0, 5),
      popularTopics,
      membershipGrowth,
      engagementMetrics,
    };
  } catch (error) {
    console.error('Error generating community analytics:', error);
    return null;
  }
};

// GET /community/posts - Get all community posts with filtering
app.get('/make-server-a278ea32/community/posts', async (c) => {
  try {
    console.log('📋 Fetching community posts...');
    
    const category = c.req.query('category');
    const search = c.req.query('search');
    const type = c.req.query('type');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    
    // Get all posts
    const posts = await kv.getByPrefix('community_post_') || [];
    
    console.log(`📊 Found ${posts.length} total posts`);
    
    // Apply filters
    let filteredPosts = posts;
    
    if (category && category !== 'All') {
      filteredPosts = filteredPosts.filter(post => post.category === category);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.content?.toLowerCase().includes(searchLower) ||
        post.authorName?.toLowerCase().includes(searchLower) ||
        post.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    if (type) {
      filteredPosts = filteredPosts.filter(post => post.type === type);
    }
    
    // Sort by pinned first, then by creation date
    filteredPosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // Apply pagination
    const paginatedPosts = filteredPosts.slice(offset, offset + limit);
    
    console.log(`✅ Returning ${paginatedPosts.length} filtered posts`);
    
    return c.json({
      success: true,
      data: {
        posts: paginatedPosts,
        total: filteredPosts.length,
        hasMore: offset + limit < filteredPosts.length
      }
    });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    return c.json({ success: false, error: 'Failed to fetch posts' }, 500);
  }
});

// POST /community/posts - Create a new community post
app.post('/make-server-a278ea32/community/posts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    console.log('🆕 Creating new community post:', body);

    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get user profile for additional info
    const userProfile = await kv.get(`community_profile_${user.id}`) || {};
    
    const newPost = {
      id: postId,
      episodeId: body.episodeId || null,
      authorId: user.id,
      authorName: body.authorName || user.user_metadata?.name || user.email,
      authorAvatar: userProfile.avatar || user.user_metadata?.avatar_url || `https://ui-avatars.io/api/?name=${encodeURIComponent(body.authorName || user.email)}&background=random`,
      authorBadges: body.authorBadges || userProfile.badges || [],
      isCreator: body.isCreator !== undefined ? body.isCreator : isCreator(user),
      isVip: body.isVip !== undefined ? body.isVip : (user.user_metadata?.subscription === 'vip'),
      content: body.content,
      mediaUrls: body.mediaUrls || [],
      type: body.type || 'discussion',
      category: body.category || 'General Discussion',
      tags: body.tags || [],
      isPinned: body.isPinned || false,
      isLocked: body.isLocked || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        replies: 0,
        shares: 0,
        views: 0,
        userLiked: false,
        userSaved: false,
      },
      poll: body.poll || null,
    };

    await kv.set(`community_post_${postId}`, newPost);
    
    // Update user stats
    if (userProfile.stats) {
      userProfile.stats.postsCount = (userProfile.stats.postsCount || 0) + 1;
      await kv.set(`community_profile_${user.id}`, userProfile);
    }

    console.log('✅ Community post created successfully:', postId);
    return c.json({ success: true, data: newPost });
  } catch (error) {
    console.error('Error creating community post:', error);
    return c.json({ success: false, error: 'Failed to create post' }, 500);
  }
});

// POST /community/posts/:postId/like - Like/unlike a post
app.post('/make-server-a278ea32/community/posts/:postId/like', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    const post = await kv.get(`community_post_${postId}`);
    
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }

    // Check if user already liked this post
    const likeKey = `community_like_${postId}_${user.id}`;
    const existingLike = await kv.get(likeKey);
    
    if (existingLike) {
      // Unlike the post
      await kv.del(likeKey);
      post.engagement.likes = Math.max(0, post.engagement.likes - 1);
      post.engagement.userLiked = false;
    } else {
      // Like the post
      await kv.set(likeKey, {
        postId,
        userId: user.id,
        createdAt: new Date().toISOString()
      });
      post.engagement.likes += 1;
      post.engagement.userLiked = true;
    }

    await kv.set(`community_post_${postId}`, post);

    return c.json({ success: true, data: post });
  } catch (error) {
    console.error('Error liking post:', error);
    return c.json({ success: false, error: 'Failed to like post' }, 500);
  }
});

// GET /community/submissions - Get user submissions
app.get('/make-server-a278ea32/community/submissions', async (c) => {
  try {
    console.log('📋 Fetching community submissions...');
    
    const submissions = await kv.getByPrefix('community_submission_') || [];
    
    // Sort by creation date
    submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`✅ Returning ${submissions.length} submissions`);
    
    return c.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return c.json({ success: false, error: 'Failed to fetch submissions' }, 500);
  }
});

// POST /community/submissions - Create a new submission
app.post('/make-server-a278ea32/community/submissions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    console.log('🆕 Creating new submission:', body);

    const submissionId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSubmission = {
      id: submissionId,
      userId: user.id,
      userName: body.userName || user.user_metadata?.name || user.email,
      userAvatar: user.user_metadata?.avatar_url || `https://ui-avatars.io/api/?name=${encodeURIComponent(body.userName || user.email)}&background=random`,
      type: body.type,
      title: body.title,
      content: body.content,
      mediaUrls: body.mediaUrls || [],
      episodeId: body.episodeId || null,
      status: 'pending',
      tags: body.tags || [],
      votes: 0,
      userVoted: false,
      createdAt: new Date().toISOString(),
      creatorResponse: null,
      usedInEpisode: null,
    };

    await kv.set(`community_submission_${submissionId}`, newSubmission);

    console.log('✅ Submission created successfully:', submissionId);
    return c.json({ success: true, data: newSubmission });
  } catch (error) {
    console.error('Error creating submission:', error);
    return c.json({ success: false, error: 'Failed to create submission' }, 500);
  }
});

// POST /community/submissions/:submissionId/vote - Vote on a submission
app.post('/make-server-a278ea32/community/submissions/:submissionId/vote', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const submissionId = c.req.param('submissionId');
    const submission = await kv.get(`community_submission_${submissionId}`);
    
    if (!submission) {
      return c.json({ success: false, error: 'Submission not found' }, 404);
    }

    // Check if user already voted
    const voteKey = `community_vote_${submissionId}_${user.id}`;
    const existingVote = await kv.get(voteKey);
    
    if (existingVote) {
      // Remove vote
      await kv.del(voteKey);
      submission.votes = Math.max(0, submission.votes - 1);
      submission.userVoted = false;
    } else {
      // Add vote
      await kv.set(voteKey, {
        submissionId,
        userId: user.id,
        createdAt: new Date().toISOString()
      });
      submission.votes += 1;
      submission.userVoted = true;
    }

    await kv.set(`community_submission_${submissionId}`, submission);

    return c.json({ success: true, data: submission });
  } catch (error) {
    console.error('Error voting on submission:', error);
    return c.json({ success: false, error: 'Failed to vote on submission' }, 500);
  }
});

// GET /community/analytics - Get community analytics
app.get('/make-server-a278ea32/community/analytics', async (c) => {
  try {
    console.log('📊 Generating community analytics...');
    
    const analytics = await generateCommunityAnalytics();
    
    if (!analytics) {
      return c.json({ success: false, error: 'Failed to generate analytics' }, 500);
    }
    
    console.log('✅ Analytics generated successfully');
    return c.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error getting community analytics:', error);
    return c.json({ success: false, error: 'Failed to get analytics' }, 500);
  }
});

// GET /community/profile/:userId - Get user community profile
app.get('/make-server-a278ea32/community/profile/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    let profile = await kv.get(`community_profile_${userId}`);
    
    if (!profile) {
      // Create default profile if it doesn't exist
      profile = {
        userId,
        displayName: 'Community Member',
        bio: '',
        avatar: `https://ui-avatars.io/api/?name=Member&background=random`,
        joinedAt: new Date().toISOString(),
        stats: {
          postsCount: 0,
          repliesCount: 0,
          likesReceived: 0,
          questionsSubmitted: 0,
          storiesShared: 0,
          challengesParticipated: 0,
          qaSessionsAttended: 0,
        },
        achievements: [],
        badges: [],
        level: 1,
        experience: 0,
        nextLevelExperience: 100,
        reputation: 0,
      };
      
      await kv.set(`community_profile_${userId}`, profile);
    }
    
    return c.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error getting community profile:', error);
    return c.json({ success: false, error: 'Failed to get profile' }, 500);
  }
});

// PUT /community/profile - Update user community profile
app.put('/make-server-a278ea32/community/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    
    let profile = await kv.get(`community_profile_${user.id}`) || {};
    
    // Update profile with new data
    const updatedProfile = {
      ...profile,
      ...body,
      userId: user.id, // Ensure userId is always set correctly
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`community_profile_${user.id}`, updatedProfile);
    
    return c.json({ success: true, data: updatedProfile });
  } catch (error) {
    console.error('Error updating community profile:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// ========================= NOURISH ROUTES =========================
// "Nourish by Oriri" — persistent wellness meal planner.
// State lives in a single per-user blob (nourish_state_<uid>); favourites use a
// prefix collection (nourish_fav_<uid>_<mealId>) so they scale independently.

/**
 * ISO-8601 week string for a date, e.g. "2026-W29".
 * Uses the Thursday rule so the ISO year is correct across W52/W53 → W01.
 */
function nourishIsoWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** Authenticate a Nourish request. Returns the user id or null. */
async function nourishUserId(c: any): Promise<string | null> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user.id;
}

/**
 * Recompute the engagement streak. Server-authoritative so it can't be spoofed
 * from the client: same week → unchanged, exactly the previous week → +1,
 * any larger gap (or first ever) → reset to 1.
 */
function nourishStreak(prevStreak: number, lastEngagedWeek: string, currentWeek: string): number {
  if (!lastEngagedWeek) return 1;
  if (lastEngagedWeek === currentWeek) return Math.max(prevStreak || 1, 1);
  const prevWeek = nourishIsoWeek(new Date(Date.now() - 7 * 86400000));
  if (lastEngagedWeek === prevWeek) return (prevStreak || 0) + 1;
  return 1;
}

const NOURISH_GOALS = ['gut_health', 'glowing_skin', 'hormone_balance', 'energy_boost', 'weight_balance'];

const NOURISH_GOAL_KEYWORDS: Record<string, string[]> = {
  gut_health:      ['gut', 'bloat', 'microbiome', 'digest', 'stomach'],
  glowing_skin:    ['skin', 'glow', 'beauty', 'acne', 'collagen'],
  hormone_balance: ['hormone', 'cycle', 'period', 'pms', 'fertility', 'menopause'],
  energy_boost:    ['energy', 'fatigue', 'tired', 'sleep', 'burnout'],
  weight_balance:  ['weight', 'metabolism', 'fitness', 'body', 'exercise'],
};

// Get the current user's Nourish state
app.get('/make-server-a278ea32/nourish/state', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const state = await kv.get(`nourish_state_${userId}`);
    const currentWeek = nourishIsoWeek();

    return c.json({
      success: true,
      data: state ?? null,
      currentWeek,
      newWeekAvailable: !!state && state.isoWeek !== currentWeek,
    });
  } catch (error: any) {
    console.error('[Nourish] Error loading state:', error.message);
    return c.json({ success: false, error: `Failed to load Nourish state: ${error.message}` }, 500);
  }
});

// Upsert the current user's Nourish state (goal / quiz / checklist)
app.put('/make-server-a278ea32/nourish/state', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    if (body.goal && !NOURISH_GOALS.includes(body.goal)) {
      return c.json({ success: false, error: `Unknown goal: ${body.goal}` }, 400);
    }

    const existing = await kv.get(`nourish_state_${userId}`);
    const currentWeek = nourishIsoWeek();
    const now = new Date().toISOString();

    const next = {
      version: 1,
      goal: body.goal ?? existing?.goal ?? null,
      isoWeek: body.isoWeek ?? existing?.isoWeek ?? currentWeek,
      quiz: body.quiz !== undefined ? body.quiz : (existing?.quiz ?? null),
      checklist: body.checklist ?? existing?.checklist ?? {},
      // Streak + engagement week are always recomputed server-side.
      streakCount: nourishStreak(existing?.streakCount ?? 0, existing?.lastEngagedWeek ?? '', currentWeek),
      lastEngagedWeek: currentWeek,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await kv.set(`nourish_state_${userId}`, next);
    console.log(`[Nourish] Saved state for ${userId} (goal=${next.goal}, week=${next.isoWeek}, streak=${next.streakCount})`);

    return c.json({ success: true, data: next, currentWeek, newWeekAvailable: next.isoWeek !== currentWeek });
  } catch (error: any) {
    console.error('[Nourish] Error saving state:', error.message);
    return c.json({ success: false, error: `Failed to save Nourish state: ${error.message}` }, 500);
  }
});

// Toggle a single grocery checklist item (high-frequency, avoids resending the blob)
app.patch('/make-server-a278ea32/nourish/checklist', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const { itemId, checked } = await c.req.json();
    if (!itemId) return c.json({ success: false, error: 'itemId is required' }, 400);

    const state = await kv.get(`nourish_state_${userId}`);
    if (!state) return c.json({ success: false, error: 'No Nourish plan to update' }, 404);

    const checklist = { ...(state.checklist ?? {}) };
    if (checked) checklist[itemId] = true;
    else delete checklist[itemId];

    const next = { ...state, checklist, updatedAt: new Date().toISOString() };
    await kv.set(`nourish_state_${userId}`, next);

    return c.json({ success: true, checklist, checkedCount: Object.keys(checklist).length });
  } catch (error: any) {
    console.error('[Nourish] Error updating checklist:', error.message);
    return c.json({ success: false, error: `Failed to update checklist: ${error.message}` }, 500);
  }
});

// Start a fresh week: new isoWeek, cleared checklist, streak bumped
app.post('/make-server-a278ea32/nourish/regenerate', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const body = await c.req.json().catch(() => ({}));
    const existing = await kv.get(`nourish_state_${userId}`);
    const goal = body.goal ?? existing?.goal;

    if (!goal) return c.json({ success: false, error: 'goal is required' }, 400);
    if (!NOURISH_GOALS.includes(goal)) return c.json({ success: false, error: `Unknown goal: ${goal}` }, 400);

    const currentWeek = nourishIsoWeek();
    const now = new Date().toISOString();

    // Clearing the checklist and stamping the new week must happen together,
    // otherwise last week's ticks bleed into the new plan.
    const next = {
      version: 1,
      goal,
      isoWeek: currentWeek,
      quiz: existing?.quiz ?? null,
      checklist: {},
      streakCount: nourishStreak(existing?.streakCount ?? 0, existing?.lastEngagedWeek ?? '', currentWeek),
      lastEngagedWeek: currentWeek,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await kv.set(`nourish_state_${userId}`, next);
    console.log(`[Nourish] Regenerated ${userId} for ${currentWeek} (streak=${next.streakCount})`);

    return c.json({ success: true, data: next, currentWeek, newWeekAvailable: false });
  } catch (error: any) {
    console.error('[Nourish] Error regenerating plan:', error.message);
    return c.json({ success: false, error: `Failed to regenerate plan: ${error.message}` }, 500);
  }
});

// List saved meals
app.get('/make-server-a278ea32/nourish/favorites', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const favorites = await kv.getByPrefix(`nourish_fav_${userId}_`);
    return c.json({ success: true, favorites: favorites ?? [] });
  } catch (error: any) {
    console.error('[Nourish] Error loading favorites:', error.message);
    return c.json({ success: false, error: `Failed to load favorites: ${error.message}`, favorites: [] }, 500);
  }
});

// Add / remove a saved meal
app.post('/make-server-a278ea32/nourish/favorites', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const { meal, goal, action, mealId } = await c.req.json();
    const id = mealId ?? (meal?.name ? String(meal.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null);
    if (!id) return c.json({ success: false, error: 'meal or mealId is required' }, 400);

    const key = `nourish_fav_${userId}_${id}`;

    if (action === 'remove') {
      await kv.del(key);
      return c.json({ success: true, action: 'removed', mealId: id });
    }

    if (!meal) return c.json({ success: false, error: 'meal is required to save a favourite' }, 400);

    // Store a denormalised snapshot so the Saved view renders without a plan lookup.
    await kv.set(key, { mealId: id, goal: goal ?? null, meal, savedAt: new Date().toISOString() });
    return c.json({ success: true, action: 'added', mealId: id });
  } catch (error: any) {
    console.error('[Nourish] Error updating favorite:', error.message);
    return c.json({ success: false, error: `Failed to update favorite: ${error.message}` }, 500);
  }
});

// Episodes relevant to a wellness goal ("Listen while you cook")
app.get('/make-server-a278ea32/nourish/episodes/:goal', async (c) => {
  try {
    const goal = c.req.param('goal');
    if (!NOURISH_GOALS.includes(goal)) {
      return c.json({ success: false, error: `Unknown goal: ${goal}`, episodes: [] }, 400);
    }

    const keywords = NOURISH_GOAL_KEYWORDS[goal] ?? [];
    const matches = (ep: any) =>
      keywords.some((k) => `${ep?.title ?? ''} ${ep?.description ?? ''}`.toLowerCase().includes(k));

    // 1. Admin-curated mapping wins when present.
    const curatedMap = await kv.get('nourish_episode_map').catch(() => null);
    const curatedIds: string[] = curatedMap?.[goal] ?? [];

    // 2. Pull from admin episodes + a cached external-episode list.
    const managed = await kv.getByPrefix('managed_episode_').catch(() => []);

    let external: any[] = [];
    const cache = await kv.get('nourish_episode_cache').catch(() => null);
    const CACHE_TTL = 6 * 60 * 60 * 1000;

    if (cache?.episodes && Date.now() - new Date(cache.cachedAt).getTime() < CACHE_TTL) {
      external = cache.episodes;
    } else {
      try {
        const { podcastAPIOrchestrator } = await import('./podcastOrchestrator.ts');
        const synced = await podcastAPIOrchestrator.syncAllPlatforms();
        external = synced.allEpisodes ?? [];
        await kv.set('nourish_episode_cache', { cachedAt: new Date().toISOString(), episodes: external });
      } catch (syncError: any) {
        // Cross-linking is a nice-to-have — degrade to whatever we already have.
        console.log('[Nourish] Episode sync unavailable, using cache/managed only:', syncError.message);
        external = cache?.episodes ?? [];
      }
    }

    const pool = [...(managed ?? []), ...external];
    const curated = curatedIds.length
      ? pool.filter((ep) => curatedIds.includes(ep?.id) || curatedIds.includes(ep?.platformEpisodeId))
      : [];

    const keywordHits = pool.filter((ep) => matches(ep) && !curated.includes(ep));

    // Curated first, then a capped keyword fallback so results stay relevant.
    const seen = new Set<string>();
    const episodes = [...curated, ...keywordHits]
      .filter((ep) => {
        if (!ep?.id || seen.has(ep.id)) return false;
        seen.add(ep.id);
        return true;
      })
      .slice(0, 4);

    console.log(`[Nourish] ${episodes.length} episodes matched goal "${goal}"`);
    return c.json({ success: true, episodes });
  } catch (error: any) {
    console.error('[Nourish] Error fetching goal episodes:', error.message);
    return c.json({ success: false, error: `Failed to fetch episodes: ${error.message}`, episodes: [] }, 500);
  }
});

// ========================= LISTEN PROGRESS (Continue Listening) =========================
// Per-user playback position so users can resume where they left off. Brand-new
// KV keys only (`listen_progress_<uid>_<episodeId>`) — never touches episode
// ingestion or the shared episode store.

// Save / update playback position for an episode
app.post('/make-server-a278ea32/listen/progress', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const { episodeId, position, duration, title, image } = await c.req.json();
    if (!episodeId) return c.json({ success: false, error: 'episodeId is required' }, 400);

    const pos = Number(position) || 0;
    const dur = Number(duration) || 0;
    const key = `listen_progress_${userId}_${episodeId}`;

    // Finished (or effectively finished) episodes drop off the Continue row.
    if (dur > 0 && pos / dur > 0.97) {
      await kv.del(key);
      return c.json({ success: true, action: 'completed' });
    }

    // Ignore trivial positions so a stray tap doesn't create a resume point.
    if (pos < 5) return c.json({ success: true, action: 'ignored' });

    await kv.set(key, {
      episodeId,
      position: pos,
      duration: dur,
      title: title ?? null,
      image: image ?? null,
      updatedAt: new Date().toISOString(),
    });
    return c.json({ success: true, action: 'saved' });
  } catch (error: any) {
    console.error('[Listen] Error saving progress:', error.message);
    return c.json({ success: false, error: `Failed to save progress: ${error.message}` }, 500);
  }
});

// List Continue Listening entries (most recent first)
app.get('/make-server-a278ea32/listen/progress', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const rows = (await kv.getByPrefix(`listen_progress_${userId}_`)) ?? [];
    const items = rows
      .filter((r: any) => r && r.episodeId)
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);

    return c.json({ success: true, items });
  } catch (error: any) {
    console.error('[Listen] Error loading progress:', error.message);
    return c.json({ success: false, error: `Failed to load progress: ${error.message}`, items: [] }, 500);
  }
});

// Single-episode lookup for resume-on-load
app.get('/make-server-a278ea32/listen/progress/:episodeId', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const episodeId = c.req.param('episodeId');
    const row = await kv.get(`listen_progress_${userId}_${episodeId}`);
    return c.json({ success: true, item: row ?? null });
  } catch (error: any) {
    console.error('[Listen] Error loading progress item:', error.message);
    return c.json({ success: false, error: `Failed to load progress: ${error.message}`, item: null }, 500);
  }
});

// Remove an episode from Continue Listening
app.delete('/make-server-a278ea32/listen/progress/:episodeId', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const episodeId = c.req.param('episodeId');
    await kv.del(`listen_progress_${userId}_${episodeId}`);
    return c.json({ success: true, action: 'removed', episodeId });
  } catch (error: any) {
    console.error('[Listen] Error removing progress:', error.message);
    return c.json({ success: false, error: `Failed to remove progress: ${error.message}` }, 500);
  }
});

// ========================= SAVED EPISODES (library) =========================
// Per-user saved episodes with a denormalised snapshot so the library renders
// without an episode lookup. Mirrors the Nourish favourites pattern.

app.get('/make-server-a278ea32/saved-episodes', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const saved = (await kv.getByPrefix(`savedEpisode_${userId}_`)) ?? [];
    const items = saved
      .filter((s: any) => s && s.episodeId)
      .sort((a: any, b: any) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    return c.json({ success: true, saved: items });
  } catch (error: any) {
    console.error('[Saved] Error loading saved episodes:', error.message);
    return c.json({ success: false, error: `Failed to load saved episodes: ${error.message}`, saved: [] }, 500);
  }
});

app.post('/make-server-a278ea32/saved-episodes', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const { episode, episodeId, action } = await c.req.json();
    const id = episodeId ?? episode?.id;
    if (!id) return c.json({ success: false, error: 'episode or episodeId is required' }, 400);

    const key = `savedEpisode_${userId}_${id}`;

    if (action === 'remove') {
      await kv.del(key);
      return c.json({ success: true, action: 'removed', episodeId: id });
    }

    if (!episode) return c.json({ success: false, error: 'episode is required to save' }, 400);

    await kv.set(key, { episodeId: id, episode, savedAt: new Date().toISOString() });
    return c.json({ success: true, action: 'added', episodeId: id });
  } catch (error: any) {
    console.error('[Saved] Error updating saved episode:', error.message);
    return c.json({ success: false, error: `Failed to update saved episode: ${error.message}` }, 500);
  }
});

// ========================= EPISODE SEARCH (safe, cached) =========================
// Reads the cached `managed_episode_*` store only — NO syncAllPlatforms(), no
// external API calls, no quota usage. Same filter logic as /podcast/search but
// over KV data.

app.get('/make-server-a278ea32/episodes/search', async (c) => {
  try {
    const query = (c.req.query('q') ?? '').trim().toLowerCase();
    const limit = parseInt(c.req.query('limit') || '20');
    if (!query) return c.json({ success: true, data: [], query: '', count: 0 });

    const episodes = (await kv.getByPrefix('managed_episode_')) ?? [];
    const results = episodes
      .filter((ep: any) =>
        `${ep?.title ?? ''}`.toLowerCase().includes(query) ||
        `${ep?.description ?? ''}`.toLowerCase().includes(query),
      )
      .slice(0, limit);

    return c.json({ success: true, data: results, query, count: results.length });
  } catch (error: any) {
    console.error('[Search] Error searching episodes:', error.message);
    return c.json({ success: false, error: `Failed to search episodes: ${error.message}`, data: [] }, 500);
  }
});

// ========================= ORIRI JOURNEY (gamification) =========================
// Additive, server-authoritative listen streak + badges. Never touches
// nourishStreak / nourish_state_* — only reads them for a combined view.

const JOURNEY_BADGES: { id: string; check: (ctx: any) => boolean }[] = [
  { id: 'first_listen',        check: (x) => x.totalListens >= 1 },
  { id: 'total_listens_10',    check: (x) => x.totalListens >= 10 },
  { id: 'total_listens_50',    check: (x) => x.totalListens >= 50 },
  { id: 'listen_streak_7',     check: (x) => x.listenStreak >= 7 },
  { id: 'listen_streak_30',    check: (x) => x.listenStreak >= 30 },
  { id: 'nourish_streak_4',    check: (x) => x.nourishStreak >= 4 },
];

/** Day-granularity streak (UTC YYYY-MM-DD): same day → unchanged, yesterday → +1, gap/first → 1. */
function journeyStreak(prevStreak: number, lastListenDate: string, today: string): number {
  if (!lastListenDate) return 1;
  if (lastListenDate === today) return Math.max(prevStreak || 1, 1);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastListenDate === yesterday) return (prevStreak || 0) + 1;
  return 1;
}

function evaluateJourneyBadges(state: any, nourishStreakCount: number): { id: string; earnedAt: string }[] {
  const earned = new Set((state.badges ?? []).map((b: any) => b.id));
  const ctx = {
    totalListens: state.totalListens ?? 0,
    listenStreak: state.listenStreak ?? 0,
    nourishStreak: nourishStreakCount ?? 0,
  };
  const now = new Date().toISOString();
  const badges = [...(state.badges ?? [])];
  for (const b of JOURNEY_BADGES) {
    if (!earned.has(b.id) && b.check(ctx)) badges.push({ id: b.id, earnedAt: now });
  }
  return badges;
}

app.get('/make-server-a278ea32/journey', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const state = await kv.get(`journey_${userId}`);
    const nourish = await kv.get(`nourish_state_${userId}`).catch(() => null);
    return c.json({
      success: true,
      data: state ?? null,
      nourishStreak: nourish?.streakCount ?? 0,
    });
  } catch (error: any) {
    console.error('[Journey] Error loading journey:', error.message);
    return c.json({ success: false, error: `Failed to load journey: ${error.message}` }, 500);
  }
});

app.post('/make-server-a278ea32/journey/listen', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const existing = await kv.get(`journey_${userId}`);
    const nourish = await kv.get(`nourish_state_${userId}`).catch(() => null);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // Count one listen per day toward totals to keep the number meaningful.
    const alreadyToday = existing?.lastListenDate === today;
    const totalListens = (existing?.totalListens ?? 0) + (alreadyToday ? 0 : 1);
    const listenStreak = journeyStreak(existing?.listenStreak ?? 0, existing?.lastListenDate ?? '', today);

    const base = {
      version: 1,
      listenStreak,
      lastListenDate: today,
      totalListens,
      badges: existing?.badges ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    base.badges = evaluateJourneyBadges(base, nourish?.streakCount ?? 0);

    await kv.set(`journey_${userId}`, base);
    return c.json({ success: true, data: base, nourishStreak: nourish?.streakCount ?? 0 });
  } catch (error: any) {
    console.error('[Journey] Error recording listen:', error.message);
    return c.json({ success: false, error: `Failed to record listen: ${error.message}` }, 500);
  }
});

// ========================= WEB PUSH ROUTES =========================
// Opt-in browser push for new-episode / live-start alerts. Strictly additive:
// per-user KV keys (push_sub_${uid}) and an admin-only send. VAPID private key
// lives only in Edge env secrets; the public key is served for subscription.
// The sender is imported dynamically inside the handler so a missing/broken
// dependency can never affect module load or any other route.

app.get('/make-server-a278ea32/push/vapid-public-key', (c) => {
  const key = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  return c.json({ success: !!key, key });
});

app.post('/make-server-a278ea32/push/subscribe', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const body = await c.req.json().catch(() => ({}));
    const subscription = body?.subscription;
    if (!subscription?.endpoint) {
      return c.json({ success: false, error: 'Missing subscription' }, 400);
    }

    await kv.set(`push_sub_${userId}`, {
      userId,
      subscription,
      updatedAt: new Date().toISOString(),
    });
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Push] subscribe error:', error.message);
    return c.json({ success: false, error: `Failed to subscribe: ${error.message}` }, 500);
  }
});

app.delete('/make-server-a278ea32/push/subscribe', async (c) => {
  try {
    const userId = await nourishUserId(c);
    if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);
    await kv.del(`push_sub_${userId}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Push] unsubscribe error:', error.message);
    return c.json({ success: false, error: `Failed to unsubscribe: ${error.message}` }, 500);
  }
});

app.post('/make-server-a278ea32/push/send', async (c) => {
  try {
    // Admin gate (same check as /admin/episodes).
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.isCreator === true;
    if (!isAdmin) return c.json({ success: false, error: 'Forbidden' }, 403);

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@oriri.app';
    if (!publicKey || !privateKey) {
      return c.json({ success: false, error: 'VAPID keys not configured' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const payload = JSON.stringify({
      title: body?.title || 'Oriri',
      body: body?.body || 'New episode available!',
      url: body?.url || '/',
      tag: body?.tag || 'oriri-update',
      icon: body?.icon,
    });

    // Dynamic import keeps a broken dependency from ever affecting module load.
    const webpush = (await import('https://esm.sh/web-push@3.6.7')).default;
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = await kv.getByPrefix('push_sub_');
    let sent = 0;
    let pruned = 0;

    await Promise.all(
      (subs || []).map(async (record: any) => {
        if (!record?.subscription?.endpoint) return;
        try {
          await webpush.sendNotification(record.subscription, payload);
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          // Prune dead subscriptions so we don't keep retrying them.
          if (status === 404 || status === 410) {
            await kv.del(`push_sub_${record.userId}`).catch(() => {});
            pruned++;
          }
        }
      }),
    );

    return c.json({ success: true, sent, pruned, total: (subs || []).length });
  } catch (error: any) {
    console.error('[Push] send error:', error.message);
    return c.json({ success: false, error: `Failed to send: ${error.message}` }, 500);
  }
});

// ========================= SOCIAL ROUTES =========================
// Powers the /links link-in-bio page, the follow surfaces, the curated social
// showcase, and click attribution. Config lives in one KV blob so the admin can
// edit everything without a deploy.

/** Resolve the signed-in user, or null. */
async function socialUser(c: any): Promise<any | null> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
}

function socialIsAdmin(user: any): boolean {
  return user?.user_metadata?.role === 'admin' || user?.user_metadata?.isCreator === true;
}

/**
 * Podcast show URLs are built from server-side secrets, so the frontend never
 * needs to hardcode (or leak) the show ids.
 */
function socialShowUrls(): Record<string, string> {
  const spotifyShowId = Deno.env.get('SPOTIFY_SHOW_ID');
  const appleShowId = Deno.env.get('APPLE_PODCASTS_SHOW_ID');
  return {
    spotify: spotifyShowId ? `https://open.spotify.com/show/${spotifyShowId}` : '',
    applePodcasts: appleShowId ? `https://podcasts.apple.com/podcast/id${appleShowId}` : '',
  };
}

/** Fill in any profile that has no URL but whose platform we can resolve. */
function socialWithShowUrls(config: any) {
  if (!config?.profiles) return config;
  const urls = socialShowUrls();
  return {
    ...config,
    profiles: config.profiles.map((p: any) =>
      !p.url && urls[p.platform] ? { ...p, url: urls[p.platform] } : p
    ),
  };
}

// Public: read the social config
app.get('/make-server-a278ea32/social/config', async (c) => {
  try {
    const config = await kv.get('social_config');
    return c.json({
      success: true,
      data: config ? socialWithShowUrls(config) : null,
      showUrls: socialShowUrls(),
    });
  } catch (error: any) {
    console.error('[Social] Error reading config:', error.message);
    return c.json({ success: false, error: `Failed to read social config: ${error.message}` }, 500);
  }
});

// Admin: replace the social config
app.put('/make-server-a278ea32/social/config', async (c) => {
  try {
    const user = await socialUser(c);
    if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);
    if (!socialIsAdmin(user)) {
      return c.json({ success: false, error: 'Admin access required to edit social config' }, 403);
    }

    const body = await c.req.json();
    const config = {
      profiles: Array.isArray(body.profiles) ? body.profiles : [],
      links: Array.isArray(body.links) ? body.links : [],
      showcase: Array.isArray(body.showcase) ? body.showcase : [],
      updatedAt: new Date().toISOString(),
    };

    await kv.set('social_config', config);
    console.log(`[Social] Config saved by ${user.email}: ${config.links.length} links, ${config.showcase.length} showcase posts`);

    return c.json({ success: true, data: socialWithShowUrls(config) });
  } catch (error: any) {
    console.error('[Social] Error saving config:', error.message);
    return c.json({ success: false, error: `Failed to save social config: ${error.message}` }, 500);
  }
});

// Public: record a link click. Never fails the caller — analytics must not block UX.
app.post('/make-server-a278ea32/social/click', async (c) => {
  try {
    const { linkId, source } = await c.req.json();
    if (!linkId) return c.json({ success: true, skipped: 'no linkId' });

    const stats = (await kv.get('social_link_stats')) || {};
    const entry = stats[linkId] || { clicks: 0, lastClickAt: null };
    stats[linkId] = {
      clicks: (entry.clicks || 0) + 1,
      lastClickAt: new Date().toISOString(),
      lastSource: source || null,
    };

    const day = new Date().toISOString().split('T')[0];
    const bucketKey = `social_clicks_${day}`;
    const bucket = (await kv.get(bucketKey)) || {};
    bucket[linkId] = (bucket[linkId] || 0) + 1;

    await kv.mset(['social_link_stats', bucketKey], [stats, bucket]);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Social] Error tracking click:', error.message);
    // Deliberately 200 — a failed click record should never surface to the visitor.
    return c.json({ success: true, tracked: false });
  }
});

// Admin: click totals + recent daily buckets
app.get('/make-server-a278ea32/social/stats', async (c) => {
  try {
    const user = await socialUser(c);
    if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);
    if (!socialIsAdmin(user)) {
      return c.json({ success: false, error: 'Admin access required to view social stats' }, 403);
    }

    const totals = (await kv.get('social_link_stats')) || {};

    // Last 30 days of buckets, newest first.
    const days: string[] = [];
    for (let i = 0; i < 30; i++) {
      days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
    }
    const buckets = await kv.mget(days.map((d) => `social_clicks_${d}`));
    const daily = days
      .map((date, i) => ({ date, clicks: buckets?.[i] || {} }))
      .filter((d) => Object.keys(d.clicks).length > 0);

    return c.json({ success: true, data: { totals, daily } });
  } catch (error: any) {
    console.error('[Social] Error reading stats:', error.message);
    return c.json({ success: false, error: `Failed to read social stats: ${error.message}` }, 500);
  }
});

// ========================= COMMUNITY ROUTES =========================

// Get all community posts
app.get('/make-server-a278ea32/community/posts', async (c) => {
  try {
    console.log('[Community] Fetching all community posts...');
    
    // Get all posts from KV store
    const posts = await kv.getByPrefix('community_post_') || [];
    
    console.log(`[Community] Retrieved ${posts.length} posts from database`);
    
    // Sort by creation date (newest first)
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({
      success: true,
      data: {
        posts: posts,
        totalCount: posts.length
      }
    });
  } catch (error) {
    console.error('[Community] Error fetching posts:', error);
    return c.json({ success: false, error: 'Failed to fetch community posts' }, 500);
  }
});

// Create a new community post
app.post('/make-server-a278ea32/community/posts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const postData = await c.req.json();
    console.log('[Community] Creating new post...', { userId: user.id, type: postData.type });
    
    // Generate unique post ID
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine user role and badges
    const isCreator = user.user_metadata?.isCreator === true || user.user_metadata?.role === 'admin';
    const isVip = user.user_metadata?.vipStatus === 'active' || user.user_metadata?.isVip === true;
    
    const authorBadges = [];
    if (isCreator) authorBadges.push('Creator');
    if (isVip) authorBadges.push('VIP');
    
    // Create the post object
    const newPost = {
      id: postId,
      episodeId: postData.episodeId || null,
      authorId: user.id,
      authorName: user.user_metadata?.name || user.email,
      authorAvatar: user.user_metadata?.avatar_url || null,
      authorBadges: authorBadges,
      isCreator: isCreator,
      isVip: isVip,
      content: postData.content,
      mediaUrls: postData.mediaUrls || [],
      type: postData.type,
      category: postData.category,
      tags: postData.tags || [],
      isPinned: false,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engagement: {
        likes: 0,
        replies: 0,
        shares: 0,
        views: 0,
        userLiked: false,
        userSaved: false,
      },
      poll: postData.poll || null
    };
    
    // Save to KV store
    await kv.set(`community_post_${postId}`, newPost);
    
    console.log('[Community] Post created successfully:', postId);
    return c.json({ success: true, data: newPost });
  } catch (error) {
    console.error('[Community] Error creating post:', error);
    return c.json({ success: false, error: 'Failed to create post' }, 500);
  }
});

// Like/unlike a community post
app.post('/make-server-a278ea32/community/posts/:postId/like', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    console.log('[Community] Toggling like for post:', postId, 'User:', user.id);
    
    // Get the post
    const post = await kv.get(`community_post_${postId}`);
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }
    
    // Check if user already liked this post
    const likeKey = `community_post_like_${postId}_${user.id}`;
    const existingLike = await kv.get(likeKey);
    
    let wasLiked = !!existingLike;
    let newLikeCount = post.engagement.likes;
    
    if (wasLiked) {
      // Unlike
      await kv.del(likeKey);
      newLikeCount = Math.max(0, newLikeCount - 1);
    } else {
      // Like
      await kv.set(likeKey, {
        userId: user.id,
        postId: postId,
        timestamp: new Date().toISOString()
      });
      newLikeCount = newLikeCount + 1;
    }
    
    // Update post engagement
    const updatedPost = {
      ...post,
      engagement: {
        ...post.engagement,
        likes: newLikeCount,
        userLiked: !wasLiked
      },
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`community_post_${postId}`, updatedPost);
    
    console.log('[Community] Post like toggled:', { postId, wasLiked: !wasLiked, newCount: newLikeCount });
    return c.json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('[Community] Error toggling post like:', error);
    return c.json({ success: false, error: 'Failed to toggle like' }, 500);
  }
});

// Save/unsave a community post
app.post('/make-server-a278ea32/community/posts/:postId/save', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    console.log('[Community] Toggling save for post:', postId, 'User:', user.id);
    
    // Check if user already saved this post
    const saveKey = `community_post_save_${postId}_${user.id}`;
    const existingSave = await kv.get(saveKey);
    
    let wasSaved = !!existingSave;
    
    if (wasSaved) {
      // Unsave
      await kv.del(saveKey);
    } else {
      // Save
      await kv.set(saveKey, {
        userId: user.id,
        postId: postId,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[Community] Post save toggled:', { postId, isSaved: !wasSaved });
    return c.json({ success: true, isSaved: !wasSaved });
  } catch (error) {
    console.error('[Community] Error toggling post save:', error);
    return c.json({ success: false, error: 'Failed to toggle save' }, 500);
  }
});

// ========================= COMMUNITY MODERATION ROUTES =========================

// Approve a community post (Admin/Moderator only)
app.post('/make-server-a278ea32/community/posts/:postId/approve', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com' ||
                   user.user_metadata?.isAdmin === true;

    if (!isAdmin) {
      return c.json({ success: false, error: 'Only admins can approve posts' }, 403);
    }

    const postId = c.req.param('postId');
    console.log('[Community] Approving post:', postId, 'by admin:', user.id);
    
    // Get the post
    const post = await kv.get(`community_post_${postId}`);
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }
    
    // Update post status to approved
    const updatedPost = {
      ...post,
      status: 'approved',
      updatedAt: new Date().toISOString(),
      moderatedBy: user.id,
      moderatedAt: new Date().toISOString()
    };
    
    await kv.set(`community_post_${postId}`, updatedPost);
    
    console.log('[Community] Post approved successfully:', postId);
    return c.json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('[Community] Error approving post:', error);
    return c.json({ success: false, error: 'Failed to approve post' }, 500);
  }
});

// Reject a community post (Admin/Moderator only)
app.post('/make-server-a278ea32/community/posts/:postId/reject', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com' ||
                   user.user_metadata?.isAdmin === true;

    if (!isAdmin) {
      return c.json({ success: false, error: 'Only admins can reject posts' }, 403);
    }

    const postId = c.req.param('postId');
    console.log('[Community] Rejecting post:', postId, 'by admin:', user.id);
    
    // Get the post
    const post = await kv.get(`community_post_${postId}`);
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }
    
    // Update post status to rejected
    const updatedPost = {
      ...post,
      status: 'rejected',
      updatedAt: new Date().toISOString(),
      moderatedBy: user.id,
      moderatedAt: new Date().toISOString()
    };
    
    await kv.set(`community_post_${postId}`, updatedPost);
    
    console.log('[Community] Post rejected successfully:', postId);
    return c.json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('[Community] Error rejecting post:', error);
    return c.json({ success: false, error: 'Failed to reject post' }, 500);
  }
});

// Pin/unpin a community post (Admin/Moderator only)
app.post('/make-server-a278ea32/community/posts/:postId/pin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com' ||
                   user.user_metadata?.isAdmin === true;

    if (!isAdmin) {
      return c.json({ success: false, error: 'Only admins can pin posts' }, 403);
    }

    const postId = c.req.param('postId');
    console.log('[Community] Toggling pin for post:', postId, 'by admin:', user.id);
    
    // Get the post
    const post = await kv.get(`community_post_${postId}`);
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }
    
    // Toggle pin status
    const updatedPost = {
      ...post,
      isPinned: !post.isPinned,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`community_post_${postId}`, updatedPost);
    
    console.log('[Community] Post pin toggled:', postId, 'isPinned:', updatedPost.isPinned);
    return c.json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('[Community] Error pinning post:', error);
    return c.json({ success: false, error: 'Failed to pin post' }, 500);
  }
});

// Lock/unlock a community post (Admin/Moderator only)
app.post('/make-server-a278ea32/community/posts/:postId/lock', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com' ||
                   user.user_metadata?.isAdmin === true;

    if (!isAdmin) {
      return c.json({ success: false, error: 'Only admins can lock posts' }, 403);
    }

    const postId = c.req.param('postId');
    console.log('[Community] Toggling lock for post:', postId, 'by admin:', user.id);
    
    // Get the post
    const post = await kv.get(`community_post_${postId}`);
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }
    
    // Toggle lock status
    const updatedPost = {
      ...post,
      isLocked: !post.isLocked,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`community_post_${postId}`, updatedPost);
    
    console.log('[Community] Post lock toggled:', postId, 'isLocked:', updatedPost.isLocked);
    return c.json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('[Community] Error locking post:', error);
    return c.json({ success: false, error: 'Failed to lock post' }, 500);
  }
});

// Delete a community post (Admin/Moderator only OR post author)
app.delete('/make-server-a278ea32/community/posts/:postId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const postId = c.req.param('postId');
    console.log('[Community] Deleting post:', postId, 'by user:', user.id);
    
    // Get the post
    const post = await kv.get(`community_post_${postId}`);
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }
    
    // Check if user is admin or the post author
    const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com' ||
                   user.user_metadata?.isAdmin === true;
    const isAuthor = post.authorId === user.id;
    
    if (!isAdmin && !isAuthor) {
      return c.json({ success: false, error: 'Only admins or post author can delete this post' }, 403);
    }
    
    // Delete the post
    await kv.del(`community_post_${postId}`);
    
    console.log('[Community] Post deleted successfully:', postId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Community] Error deleting post:', error);
    return c.json({ success: false, error: 'Failed to delete post' }, 500);
  }
});

// Get all community submissions
app.get('/make-server-a278ea32/community/submissions', async (c) => {
  try {
    console.log('[Community] Fetching all community submissions...');
    
    // Get all submissions from KV store
    const submissions = await kv.getByPrefix('community_submission_') || [];
    
    console.log(`[Community] Retrieved ${submissions.length} submissions from database`);
    
    // Sort by creation date (newest first)
    submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({
      success: true,
      data: {
        submissions: submissions,
        totalCount: submissions.length
      }
    });
  } catch (error) {
    console.error('[Community] Error fetching submissions:', error);
    return c.json({ success: false, error: 'Failed to fetch community submissions' }, 500);
  }
});

// Create a new community submission
app.post('/make-server-a278ea32/community/submissions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const submissionData = await c.req.json();
    console.log('[Community] Creating new submission...', { userId: user.id, type: submissionData.type });
    
    // Generate unique submission ID
    const submissionId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the submission object
    const newSubmission = {
      id: submissionId,
      authorId: user.id,
      authorName: user.user_metadata?.name || user.email,
      authorAvatar: user.user_metadata?.avatar_url || null,
      title: submissionData.title,
      description: submissionData.description,
      type: submissionData.type,
      category: submissionData.category,
      tags: submissionData.tags || [],
      mediaUrl: submissionData.mediaUrl || null,
      content: submissionData.content || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      votes: 0,
      userVoted: false
    };
    
    // Save to KV store
    await kv.set(`community_submission_${submissionId}`, newSubmission);
    
    console.log('[Community] Submission created successfully:', submissionId);
    return c.json({ success: true, data: newSubmission });
  } catch (error) {
    console.error('[Community] Error creating submission:', error);
    return c.json({ success: false, error: 'Failed to create submission' }, 500);
  }
});

// Vote on a community submission
app.post('/make-server-a278ea32/community/submissions/:submissionId/vote', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (!user || userError) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const submissionId = c.req.param('submissionId');
    console.log('[Community] Toggling vote for submission:', submissionId, 'User:', user.id);
    
    // Get the submission
    const submission = await kv.get(`community_submission_${submissionId}`);
    if (!submission) {
      return c.json({ success: false, error: 'Submission not found' }, 404);
    }
    
    // Check if user already voted on this submission
    const voteKey = `community_submission_vote_${submissionId}_${user.id}`;
    const existingVote = await kv.get(voteKey);
    
    let wasVoted = !!existingVote;
    let newVoteCount = submission.votes;
    
    if (wasVoted) {
      // Remove vote
      await kv.del(voteKey);
      newVoteCount = Math.max(0, newVoteCount - 1);
    } else {
      // Add vote
      await kv.set(voteKey, {
        userId: user.id,
        submissionId: submissionId,
        timestamp: new Date().toISOString()
      });
      newVoteCount = newVoteCount + 1;
    }
    
    // Update submission
    const updatedSubmission = {
      ...submission,
      votes: newVoteCount,
      userVoted: !wasVoted
    };
    
    await kv.set(`community_submission_${submissionId}`, updatedSubmission);
    
    console.log('[Community] Submission vote toggled:', { submissionId, wasVoted: !wasVoted, newCount: newVoteCount });
    return c.json({ success: true, data: updatedSubmission });
  } catch (error) {
    console.error('[Community] Error toggling submission vote:', error);
    return c.json({ success: false, error: 'Failed to toggle vote' }, 500);
  }
});

console.log('🚀 Community routes added successfully');

// ========================= EPISODE ANALYTICS ROUTES =========================

// Track episode play event
app.post('/make-server-a278ea32/analytics/track-play', async (c) => {
  try {
    const body = await c.req.json();
    const { episodeId, position, deviceType, sessionId, userId } = body;
    
    console.log('[Analytics] Tracking play event:', { episodeId, position, deviceType });
    
    // Get or create analytics for this episode
    const analyticsKey = `episode_analytics_${episodeId}`;
    let analytics = await kv.get(analyticsKey) || {
      episodeId,
      totalPlays: 0,
      uniqueListeners: 0,
      totalListenTime: 0,
      completions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      tips: 0,
      tipAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Increment play count
    analytics.totalPlays += 1;
    analytics.updatedAt = new Date().toISOString();
    
    // Track unique listeners by session/user
    if (userId || sessionId) {
      const listenerKey = `episode_listener_${episodeId}_${userId || sessionId}`;
      const existingListener = await kv.get(listenerKey);
      
      if (!existingListener) {
        analytics.uniqueListeners += 1;
        await kv.set(listenerKey, {
          userId: userId || null,
          sessionId: sessionId || null,
          firstPlay: new Date().toISOString(),
          deviceType,
        });
      }
    }
    
    // Save updated analytics
    await kv.set(analyticsKey, analytics);
    
    // Track individual play session for detailed analytics
    const playSessionKey = `play_session_${episodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(playSessionKey, {
      episodeId,
      userId: userId || null,
      sessionId: sessionId || null,
      startPosition: position,
      deviceType,
      timestamp: new Date().toISOString(),
    });
    
    console.log('[Analytics] Play event tracked successfully');
    return c.json({ success: true, data: analytics });
  } catch (error) {
    console.error('[Analytics] Error tracking play:', error);
    return c.json({ success: false, error: 'Failed to track play' }, 500);
  }
});

// Track episode engagement (like, comment, share, tip)
app.post('/make-server-a278ea32/analytics/track-engagement', async (c) => {
  try {
    const body = await c.req.json();
    const { episodeId, action, position, userId, metadata } = body;
    
    console.log('[Analytics] Tracking engagement:', { episodeId, action });
    
    // Get analytics for this episode
    const analyticsKey = `episode_analytics_${episodeId}`;
    let analytics = await kv.get(analyticsKey) || {
      episodeId,
      totalPlays: 0,
      uniqueListeners: 0,
      totalListenTime: 0,
      completions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      tips: 0,
      tipAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Update engagement metrics based on action
    switch (action) {
      case 'like':
        analytics.likes += 1;
        break;
      case 'comment':
        analytics.comments += 1;
        break;
      case 'share':
        analytics.shares += 1;
        break;
      case 'tip':
        analytics.tips += 1;
        analytics.tipAmount += metadata?.amount || 0;
        break;
    }
    
    analytics.updatedAt = new Date().toISOString();
    
    // Save updated analytics
    await kv.set(analyticsKey, analytics);
    
    // Track individual engagement event
    const engagementKey = `engagement_${episodeId}_${action}_${Date.now()}`;
    await kv.set(engagementKey, {
      episodeId,
      action,
      position,
      userId: userId || null,
      metadata,
      timestamp: new Date().toISOString(),
    });
    
    console.log('[Analytics] Engagement tracked successfully');
    return c.json({ success: true, data: analytics });
  } catch (error) {
    console.error('[Analytics] Error tracking engagement:', error);
    return c.json({ success: false, error: 'Failed to track engagement' }, 500);
  }
});

// Track episode completion
app.post('/make-server-a278ea32/analytics/track-completion', async (c) => {
  try {
    const body = await c.req.json();
    const { episodeId, completionRate, listenTime, userId, sessionId } = body;
    
    console.log('[Analytics] Tracking completion:', { episodeId, completionRate, listenTime });
    
    // Get analytics for this episode
    const analyticsKey = `episode_analytics_${episodeId}`;
    let analytics = await kv.get(analyticsKey) || {
      episodeId,
      totalPlays: 0,
      uniqueListeners: 0,
      totalListenTime: 0,
      completions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      tips: 0,
      tipAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Update completion metrics
    if (completionRate >= 90) {
      analytics.completions += 1;
    }
    
    analytics.totalListenTime += listenTime || 0;
    analytics.updatedAt = new Date().toISOString();
    
    // Save updated analytics
    await kv.set(analyticsKey, analytics);
    
    // Track individual completion event
    const completionKey = `completion_${episodeId}_${userId || sessionId}_${Date.now()}`;
    await kv.set(completionKey, {
      episodeId,
      completionRate,
      listenTime,
      userId: userId || null,
      sessionId: sessionId || null,
      timestamp: new Date().toISOString(),
    });
    
    console.log('[Analytics] Completion tracked successfully');
    return c.json({ success: true, data: analytics });
  } catch (error) {
    console.error('[Analytics] Error tracking completion:', error);
    return c.json({ success: false, error: 'Failed to track completion' }, 500);
  }
});

// Get episode analytics
app.get('/make-server-a278ea32/analytics/episode/:episodeId', async (c) => {
  try {
    const episodeId = c.req.param('episodeId');
    const timeframe = c.req.query('timeframe') || 'all-time'; // daily, weekly, monthly, all-time
    
    console.log('[Analytics] Fetching analytics for episode:', episodeId, 'timeframe:', timeframe);
    
    // Get base analytics
    const analyticsKey = `episode_analytics_${episodeId}`;
    const analytics = await kv.get(analyticsKey);
    
    if (!analytics) {
      // Return empty analytics if none exist
      return c.json({
        success: true,
        data: {
          episodeId,
          totalPlays: 0,
          uniqueListeners: 0,
          totalListenTime: 0,
          completions: 0,
          completionRate: 0,
          averageListenDuration: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          tips: 0,
          tipAmount: 0,
        }
      });
    }
    
    // Calculate derived metrics
    const completionRate = analytics.totalPlays > 0 
      ? Math.round((analytics.completions / analytics.totalPlays) * 100)
      : 0;
    
    const averageListenDuration = analytics.uniqueListeners > 0
      ? Math.round(analytics.totalListenTime / analytics.uniqueListeners / 60) // in minutes
      : 0;
    
    const enrichedAnalytics = {
      ...analytics,
      completionRate,
      averageListenDuration,
      engagementRate: analytics.totalPlays > 0
        ? Math.round(((analytics.likes + analytics.comments + analytics.shares) / analytics.totalPlays) * 100)
        : 0,
    };
    
    console.log('[Analytics] Analytics retrieved successfully');
    return c.json({ success: true, data: enrichedAnalytics });
  } catch (error) {
    console.error('[Analytics] Error getting episode analytics:', error);
    return c.json({ success: false, error: 'Failed to get analytics' }, 500);
  }
});

// Get top performing episodes
app.get('/make-server-a278ea32/analytics/top-episodes', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    
    console.log('[Analytics] Fetching top performing episodes, limit:', limit);
    
    // Get all episode analytics
    const allAnalytics = await kv.getByPrefix('episode_analytics_') || [];
    
    // Sort by total plays and limit
    const topEpisodes = allAnalytics
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .slice(0, limit)
      .map(analytics => ({
        ...analytics,
        completionRate: analytics.totalPlays > 0 
          ? Math.round((analytics.completions / analytics.totalPlays) * 100)
          : 0,
        averageListenDuration: analytics.uniqueListeners > 0
          ? Math.round(analytics.totalListenTime / analytics.uniqueListeners / 60)
          : 0,
      }));
    
    console.log(`[Analytics] Retrieved ${topEpisodes.length} top episodes`);
    return c.json({ success: true, data: topEpisodes });
  } catch (error) {
    console.error('[Analytics] Error getting top episodes:', error);
    return c.json({ success: false, error: 'Failed to get top episodes' }, 500);
  }
});

// Get overall platform analytics
app.get('/make-server-a278ea32/analytics/platform', async (c) => {
  try {
    console.log('[Analytics] Generating platform-wide analytics...');
    
    // Get all episode analytics
    const allAnalytics = await kv.getByPrefix('episode_analytics_') || [];
    
    // Aggregate metrics
    const platformMetrics = {
      totalEpisodes: allAnalytics.length,
      totalPlays: allAnalytics.reduce((sum, a) => sum + (a.totalPlays || 0), 0),
      totalListeners: allAnalytics.reduce((sum, a) => sum + (a.uniqueListeners || 0), 0),
      totalListenTime: allAnalytics.reduce((sum, a) => sum + (a.totalListenTime || 0), 0),
      totalEngagements: allAnalytics.reduce((sum, a) => sum + (a.likes || 0) + (a.comments || 0) + (a.shares || 0), 0),
      totalRevenue: allAnalytics.reduce((sum, a) => sum + (a.tipAmount || 0), 0),
      averageCompletionRate: allAnalytics.length > 0
        ? Math.round(allAnalytics.reduce((sum, a) => {
            const rate = a.totalPlays > 0 ? (a.completions / a.totalPlays) * 100 : 0;
            return sum + rate;
          }, 0) / allAnalytics.length)
        : 0,
    };
    
    console.log('[Analytics] Platform analytics generated successfully');
    return c.json({ success: true, data: platformMetrics });
  } catch (error) {
    console.error('[Analytics] Error generating platform analytics:', error);
    return c.json({ success: false, error: 'Failed to generate analytics' }, 500);
  }
});

console.log('🚀 Episode analytics routes added successfully');

// =============================================================================
// ADMIN ANALYTICS ROUTES
// =============================================================================
// These routes provide real-time analytics data for the admin dashboard
// All routes require admin authentication

// Helper function to check if user is admin
const verifyAdminAccess = async (c: any) => {
  const authHeader = c.req.header('Authorization');
  const accessToken = authHeader?.split(' ')[1];
  
  console.log('[verifyAdminAccess] Checking authorization...');
  console.log('[verifyAdminAccess] Auth header present:', !!authHeader);
  console.log('[verifyAdminAccess] Access token present:', !!accessToken);
  console.log('[verifyAdminAccess] Token length:', accessToken?.length);
  console.log('[verifyAdminAccess] Token prefix:', accessToken?.substring(0, 20) + '...');
  
  if (!accessToken) {
    console.error('[verifyAdminAccess] No access token provided');
    return { authorized: false, error: 'Unauthorized - No access token', status: 401 };
  }
  
  // Verify the token using the service role client
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  
  if (userError) {
    console.error('[verifyAdminAccess] Token verification error:', userError);
    console.error('[verifyAdminAccess] Error details:', {
      message: userError.message,
      status: userError.status,
      name: userError.name
    });
  }
  
  if (!user || userError) {
    console.error('[verifyAdminAccess] Authentication failed:', userError?.message || 'No user found');
    return { authorized: false, error: 'Unauthorized - Please login', status: 401 };
  }

  console.log('[verifyAdminAccess] User authenticated:', user.email);
  console.log('[verifyAdminAccess] User ID:', user.id);
  console.log('[verifyAdminAccess] User metadata:', user.user_metadata);
  
  // Check multiple admin indicators to match the logic used throughout the app
  const isAdmin = user.user_metadata?.role === 'admin' || 
                  user.email === 'admin@oriri.com' ||
                  user.user_metadata?.isAdmin === true ||
                  user.user_metadata?.isCreator === true;
  
  console.log('[verifyAdminAccess] Is admin:', isAdmin);
  
  if (!isAdmin) {
    console.error('[verifyAdminAccess] User is not admin:', {
      email: user.email,
      role: user.user_metadata?.role,
      isAdmin: user.user_metadata?.isAdmin,
      isCreator: user.user_metadata?.isCreator
    });
    return { authorized: false, error: 'Forbidden - Admin access required', status: 403 };
  }

  console.log('[verifyAdminAccess] ✅ Admin access granted');
  return { authorized: true, user };
};

// GET /admin/analytics/overview
// Returns high-level overview metrics for the admin dashboard
app.get('/make-server-a278ea32/admin/analytics/overview', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching overview metrics...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Get all episodes
    const allEpisodes = await kv.getByPrefix('managed_episode_') || [];
    
    // Get all live sessions
    const allSessions = await kv.getByPrefix('live_session_') || [];
    
    // Get all products
    const allProducts = await kv.getByPrefix('product_') || [];
    
    // Get all tips
    const allTips = await kv.getByPrefix('tip_') || [];
    
    // Get all chat messages (approximate engagement)
    const allMessages = await kv.getByPrefix('chat_message_') || [];
    
    // Get all admins (from Supabase Auth)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    const adminCount = users?.filter(u => u.user_metadata?.role === 'admin' || u.user_metadata?.isCreator).length || 0;
    
    // ✅ NEW: Get all episode engagement metrics
    const allEpisodeMetrics = await kv.getByPrefix('episode_metrics_') || [];
    const allEpisodeLikes = await kv.getByPrefix('episode_like_') || [];
    const allEpisodeViews = await kv.getByPrefix('episode_view_') || [];
    const allEpisodeComments = await kv.getByPrefix('episode_comment_') || [];
    const allEpisodeShares = await kv.getByPrefix('episode_share_') || [];
    
    // Calculate engagement totals
    const totalLikes = allEpisodeLikes.length; // Count individual like records
    const totalViews = allEpisodeViews.length; // Count individual view records
    const totalComments = allEpisodeComments.length; // Count individual comment records
    const totalShares = allEpisodeShares.length; // Count individual share records
    
    // Get unique users who engaged (liked, viewed, or commented)
    const engagedUserIds = new Set([
      ...allEpisodeLikes.map(like => like.userId).filter(Boolean),
      ...allEpisodeComments.map(comment => comment.userId).filter(Boolean)
    ]);
    const uniqueEngagedUsers = engagedUserIds.size;
    
    // Calculate metrics
    const overview = {
      // Content metrics
      totalEpisodes: allEpisodes.length,
      publishedEpisodes: allEpisodes.filter(ep => ep.status === 'published').length,
      draftEpisodes: allEpisodes.filter(ep => ep.status === 'draft').length,
      scheduledEpisodes: allEpisodes.filter(ep => ep.status === 'scheduled').length,
      vipEpisodes: allEpisodes.filter(ep => ep.isVipOnly).length,
      
      // Live session metrics
      totalLiveSessions: allSessions.length,
      upcomingSessions: allSessions.filter(s => {
        const scheduledTime = new Date(s.scheduledTime);
        return scheduledTime > new Date();
      }).length,
      
      // Engagement metrics
      totalChatMessages: allMessages.length,
      totalTips: allTips.length,
      liveTipRevenue: allTips.reduce((sum, tip) => sum + (tip.amount || 0), 0),
      
      // ✅ NEW: Episode engagement metrics
      totalLikes: totalLikes,
      totalViews: totalViews,
      totalComments: totalComments,
      totalShares: totalShares,
      uniqueEngagedUsers: uniqueEngagedUsers,
      
      // Store metrics
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter(p => p.status === 'active').length,
      lowStockItems: allProducts.filter(p => p.stock > 0 && p.stock < 10).length,
      outOfStockItems: allProducts.filter(p => p.stock === 0).length,
      
      // Admin metrics
      totalAdmins: adminCount,
      
      // Timestamp
      generatedAt: new Date().toISOString()
    };
    
    console.log('[Admin Analytics] Overview metrics generated successfully');
    return c.json({ success: true, data: overview });
  } catch (error) {
    console.error('[Admin Analytics] Error generating overview:', error);
    return c.json({ success: false, error: 'Failed to generate overview metrics' }, 500);
  }
});

// GET /admin/analytics/episodes
// Returns detailed episode statistics
app.get('/make-server-a278ea32/admin/analytics/episodes', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching episode statistics...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Get all episodes
    const allEpisodes = await kv.getByPrefix('managed_episode_') || [];
    
    // Calculate statistics
    const stats = {
      // Counts by status
      byStatus: {
        draft: allEpisodes.filter(ep => ep.status === 'draft').length,
        published: allEpisodes.filter(ep => ep.status === 'published').length,
        scheduled: allEpisodes.filter(ep => ep.status === 'scheduled').length,
        archived: allEpisodes.filter(ep => ep.status === 'archived').length,
      },
      
      // VIP vs Free
      vipEpisodes: allEpisodes.filter(ep => ep.isVipOnly).length,
      freeEpisodes: allEpisodes.filter(ep => !ep.isVipOnly).length,
      
      // By category
      byCategory: allEpisodes.reduce((acc, ep) => {
        acc[ep.category] = (acc[ep.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      
      // Media types
      audioEpisodes: allEpisodes.filter(ep => ep.audioUrl).length,
      videoEpisodes: allEpisodes.filter(ep => ep.videoUrl).length,
      
      // Total metrics (from episode fields, may not be accurate yet)
      totalViews: allEpisodes.reduce((sum, ep) => sum + (ep.views || 0), 0),
      totalLikes: allEpisodes.reduce((sum, ep) => sum + (ep.likes || 0), 0),
      totalComments: allEpisodes.reduce((sum, ep) => sum + (ep.comments || 0), 0),
      totalShares: allEpisodes.reduce((sum, ep) => sum + (ep.shares || 0), 0),
      
      // Duration stats
      totalDuration: allEpisodes.reduce((sum, ep) => sum + (ep.durationSeconds || 0), 0),
      averageDuration: allEpisodes.length > 0 
        ? Math.round(allEpisodes.reduce((sum, ep) => sum + (ep.durationSeconds || 0), 0) / allEpisodes.length)
        : 0,
      
      // Publishing trends (episodes created in last 30 days)
      recentlyCreated: allEpisodes.filter(ep => {
        const createdDate = new Date(ep.createdDate);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return createdDate > thirtyDaysAgo;
      }).length,
      
      generatedAt: new Date().toISOString()
    };
    
    console.log('[Admin Analytics] Episode statistics generated successfully');
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Admin Analytics] Error generating episode stats:', error);
    return c.json({ success: false, error: 'Failed to generate episode statistics' }, 500);
  }
});

// GET /admin/analytics/live-sessions
// Returns live session statistics and engagement metrics
app.get('/make-server-a278ea32/admin/analytics/live-sessions', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching live session statistics...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Get all live sessions
    const allSessions = await kv.getByPrefix('live_session_') || [];
    
    // Categorize sessions by time
    const now = new Date();
    const upcoming = [];
    const ongoing = [];
    const archived = [];
    
    for (const session of allSessions) {
      const scheduledTime = new Date(session.scheduledTime);
      const durationMinutes = parseInt(session.duration) || 60;
      const endTime = new Date(scheduledTime.getTime() + durationMinutes * 60 * 1000);
      
      if (now < scheduledTime) {
        upcoming.push(session);
      } else if (now >= scheduledTime && now <= endTime) {
        ongoing.push(session);
      } else {
        archived.push(session);
      }
    }
    
    // Get all chat messages
    const allMessages = await kv.getByPrefix('chat_message_') || [];
    
    // Get all tips
    const allTips = await kv.getByPrefix('tip_') || [];
    
    // Calculate statistics
    const stats = {
      // Session counts
      totalSessions: allSessions.length,
      upcomingSessions: upcoming.length,
      ongoingSessions: ongoing.length,
      archivedSessions: archived.length,
      
      // Engagement metrics
      totalChatMessages: allMessages.length,
      averageMessagesPerSession: allSessions.length > 0 
        ? Math.round(allMessages.length / allSessions.length)
        : 0,
      
      // Tip metrics
      totalTips: allTips.length,
      totalTipRevenue: allTips.reduce((sum, tip) => sum + (tip.amount || 0), 0),
      averageTipAmount: allTips.length > 0
        ? Math.round(allTips.reduce((sum, tip) => sum + (tip.amount || 0), 0) / allTips.length)
        : 0,
      
      // Viewer metrics (sum of viewerCount from sessions)
      totalViewers: allSessions.reduce((sum, s) => sum + (s.viewerCount || 0), 0),
      averageViewersPerSession: allSessions.length > 0
        ? Math.round(allSessions.reduce((sum, s) => sum + (s.viewerCount || 0), 0) / allSessions.length)
        : 0,
      
      // Platform breakdown
      byPlatform: allSessions.reduce((acc, s) => {
        const platform = s.streamPlatform || 'custom';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      
      generatedAt: new Date().toISOString()
    };
    
    console.log('[Admin Analytics] Live session statistics generated successfully');
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Admin Analytics] Error generating live session stats:', error);
    return c.json({ success: false, error: 'Failed to generate live session statistics' }, 500);
  }
});

// GET /admin/analytics/store
// Returns store and product statistics
app.get('/make-server-a278ea32/admin/analytics/store', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching store statistics...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Get all products
    const allProducts = await kv.getByPrefix('product_') || [];
    
    // Calculate statistics
    const stats = {
      // Product counts
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter(p => p.status === 'active' || !p.status).length,
      
      // Inventory health
      inStock: allProducts.filter(p => (p.stock || 0) > 10).length,
      lowStock: allProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length,
      outOfStock: allProducts.filter(p => (p.stock || 0) === 0).length,
      
      // Category breakdown
      byCategory: allProducts.reduce((acc, p) => {
        const category = p.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      
      // Inventory value (stock * price)
      totalInventoryValue: allProducts.reduce((sum, p) => {
        const stock = p.stock || 0;
        const price = p.price?.aed || p.price?.usd || 0;
        return sum + (stock * price);
      }, 0),
      
      // Average price
      averagePrice: allProducts.length > 0
        ? Math.round(allProducts.reduce((sum, p) => sum + (p.price?.aed || p.price?.usd || 0), 0) / allProducts.length)
        : 0,
      
      // Featured products
      featuredProducts: allProducts.filter(p => p.featured).length,
      
      generatedAt: new Date().toISOString()
    };
    
    console.log('[Admin Analytics] Store statistics generated successfully');
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Admin Analytics] Error generating store stats:', error);
    return c.json({ success: false, error: 'Failed to generate store statistics' }, 500);
  }
});

// =============================================================================
// PRODUCT MANAGEMENT ROUTES (CRUD)
// =============================================================================
// These routes handle product creation, reading, updating, and deletion
// GET routes are PUBLIC (anyone can view products)
// POST/PUT/DELETE routes require admin authentication

// POST /products - Create a new product
app.post('/make-server-a278ea32/products', async (c) => {
  try {
    console.log('[Product Management] Creating new product...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      console.error('[Product Management] Unauthorized product creation attempt');
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Parse request body
    const body = await c.req.json();
    const {
      name,
      description,
      price,
      stock,
      category,
      images,
      sizes,
      colors,
      featured,
      status,
      externalUrl
    } = body;

    // Validate required fields
    if (!name || !price) {
      console.error('[Product Management] Missing required fields:', { name: !!name, price: !!price });
      return c.json({ 
        success: false, 
        error: 'Missing required fields: name and price are required' 
      }, 400);
    }

    // Validate price structure (must have AED and/or USD)
    if (!price.aed && !price.usd) {
      console.error('[Product Management] Invalid price structure - missing AED or USD');
      return c.json({ 
        success: false, 
        error: 'Price must include at least AED or USD value' 
      }, 400);
    }

    // Generate unique product ID
    const productId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create product object
    const productStock = stock || 0;
    const newProduct = {
      id: productId,
      name: name.trim(),
      description: description?.trim() || '',
      price: {
        aed: price.aed || 0,
        usd: price.usd || 0
      },
      stock: productStock,
      inStock: productStock > 0,
      category: category || 'Uncategorized',
      images: images || [],
      sizes: sizes || [],
      colors: colors || [],
      featured: featured || false,
      status: status || 'active',
      externalUrl: typeof externalUrl === 'string' ? externalUrl.trim() : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: auth.user.id
    };

    // Save to KV store
    await kv.set(productId, newProduct);
    
    console.log('[Product Management] ✅ Product created successfully:', productId);
    console.log('[Product Management] Product details:', {
      name: newProduct.name,
      category: newProduct.category,
      price: newProduct.price,
      stock: newProduct.stock
    });

    return c.json({ 
      success: true, 
      data: newProduct,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('[Product Management] Error creating product:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /products - List all products with filtering and pagination
app.get('/make-server-a278ea32/products', async (c) => {
  try {
    console.log('[Product Management] Fetching products (PUBLIC endpoint)...');
    
    // NO ADMIN CHECK - This endpoint is PUBLIC so anyone can view products!
    // Only POST/PUT/DELETE require admin access

    // Get query parameters for filtering
    const category = c.req.query('category');
    const featured = c.req.query('featured');
    const status = c.req.query('status');
    const search = c.req.query('search');
    
    // Get pagination parameters
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const sortBy = c.req.query('sortBy') || 'createdAt'; // createdAt, name, price, stock
    const sortOrder = c.req.query('sortOrder') || 'desc'; // asc, desc

    console.log('[Product Management] Query params:', {
      category,
      featured,
      status,
      search,
      limit,
      offset,
      sortBy,
      sortOrder
    });

    // Fetch all products from KV store
    let allProducts = await kv.getByPrefix('product_') || [];
    console.log('[Product Management] Total products in database:', allProducts.length);
    
    // Normalize products to ensure they have the inStock field
    // This handles legacy products that were created before inStock field was added
    allProducts = allProducts.map(product => ({
      ...product,
      inStock: product.inStock !== undefined ? product.inStock : (product.stock || 0) > 0
    }));

    // Apply filters
    let filteredProducts = allProducts;

    // Filter by category
    if (category && category !== 'all') {
      filteredProducts = filteredProducts.filter(p => 
        p.category?.toLowerCase() === category.toLowerCase()
      );
      console.log('[Product Management] After category filter:', filteredProducts.length);
    }

    // Filter by featured status
    if (featured !== undefined && featured !== null && featured !== '') {
      const isFeatured = featured === 'true' || featured === '1';
      filteredProducts = filteredProducts.filter(p => p.featured === isFeatured);
      console.log('[Product Management] After featured filter:', filteredProducts.length);
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredProducts = filteredProducts.filter(p => 
        (p.status || 'active') === status
      );
      console.log('[Product Management] After status filter:', filteredProducts.length);
    }

    // Filter by search query (searches name and description)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
      console.log('[Product Management] After search filter:', filteredProducts.length);
    }

    // Sort products
    filteredProducts.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'price':
          aVal = a.price?.aed || a.price?.usd || 0;
          bVal = b.price?.aed || b.price?.usd || 0;
          break;
        case 'stock':
          aVal = a.stock || 0;
          bVal = b.stock || 0;
          break;
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    // Calculate totals before pagination
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Apply pagination
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);

    console.log('[Product Management] ✅ Products fetched successfully');
    console.log('[Product Management] Pagination info:', {
      total: totalProducts,
      returned: paginatedProducts.length,
      page: currentPage,
      totalPages
    });

    return c.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        total: totalProducts,
        limit,
        offset,
        currentPage,
        totalPages,
        hasMore: offset + limit < totalProducts
      },
      filters: {
        category: category || 'all',
        featured: featured || 'all',
        status: status || 'all',
        search: search || ''
      }
    });

  } catch (error) {
    console.error('[Product Management] Error fetching products:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /products/:id - Get a single product by ID
app.get('/make-server-a278ea32/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    console.log('[Product Management] Fetching product (PUBLIC endpoint):', productId);
    
    // NO ADMIN CHECK - This endpoint is PUBLIC so anyone can view product details!
    // Only POST/PUT/DELETE require admin access

    // Validate product ID format
    if (!productId || !productId.startsWith('product_')) {
      console.error('[Product Management] Invalid product ID format:', productId);
      return c.json({ 
        success: false, 
        error: 'Invalid product ID format' 
      }, 400);
    }

    // Fetch product from KV store
    const product = await kv.get(productId);

    // Check if product exists
    if (!product) {
      console.log('[Product Management] Product not found:', productId);
      return c.json({ 
        success: false, 
        error: 'Product not found',
        productId 
      }, 404);
    }

    // Normalize product to ensure it has the inStock field
    // This handles legacy products that were created before inStock field was added
    const normalizedProduct = {
      ...product,
      inStock: product.inStock !== undefined ? product.inStock : (product.stock || 0) > 0
    };

    console.log('[Product Management] ✅ Product fetched successfully:', productId);
    console.log('[Product Management] Product details:', {
      name: normalizedProduct.name,
      category: normalizedProduct.category,
      status: normalizedProduct.status
    });

    return c.json({
      success: true,
      data: normalizedProduct
    });

  } catch (error) {
    console.error('[Product Management] Error fetching product:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// PUT /products/:id - Update an existing product
app.put('/make-server-a278ea32/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    console.log('[Product Management] Updating product:', productId);
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      console.error('[Product Management] Unauthorized product update attempt');
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Validate product ID format
    if (!productId || !productId.startsWith('product_')) {
      console.error('[Product Management] Invalid product ID format:', productId);
      return c.json({ 
        success: false, 
        error: 'Invalid product ID format' 
      }, 400);
    }

    // Check if product exists
    const existingProduct = await kv.get(productId);
    if (!existingProduct) {
      console.log('[Product Management] Product not found for update:', productId);
      return c.json({ 
        success: false, 
        error: 'Product not found',
        productId 
      }, 404);
    }

    // Parse request body
    const body = await c.req.json();
    const {
      name,
      description,
      price,
      stock,
      category,
      images,
      sizes,
      colors,
      featured,
      status,
      externalUrl
    } = body;

    // Validate required fields
    if (!name || !price) {
      console.error('[Product Management] Missing required fields for update:', { 
        name: !!name, 
        price: !!price 
      });
      return c.json({ 
        success: false, 
        error: 'Missing required fields: name and price are required' 
      }, 400);
    }

    // Validate price structure (must have AED and/or USD)
    if (!price.aed && !price.usd) {
      console.error('[Product Management] Invalid price structure - missing AED or USD');
      return c.json({ 
        success: false, 
        error: 'Price must include at least AED or USD value' 
      }, 400);
    }

    // Create updated product object
    // IMPORTANT: Preserve original id, createdAt, and createdBy
    const updatedStock = stock !== undefined ? stock : existingProduct.stock;
    const updatedProduct = {
      ...existingProduct, // Start with existing product
      // Update with new values
      name: name.trim(),
      description: description?.trim() || '',
      price: {
        aed: price.aed || 0,
        usd: price.usd || 0
      },
      stock: updatedStock,
      inStock: updatedStock > 0,
      category: category || existingProduct.category || 'Uncategorized',
      images: images !== undefined ? images : existingProduct.images || [],
      sizes: sizes !== undefined ? sizes : existingProduct.sizes || [],
      colors: colors !== undefined ? colors : existingProduct.colors || [],
      featured: featured !== undefined ? featured : existingProduct.featured || false,
      status: status || existingProduct.status || 'active',
      externalUrl: typeof externalUrl === 'string' ? externalUrl.trim() : existingProduct.externalUrl || '',
      // Update timestamp
      updatedAt: new Date().toISOString(),
      // Preserve these critical fields
      id: existingProduct.id,
      createdAt: existingProduct.createdAt,
      createdBy: existingProduct.createdBy
    };

    // Save updated product to KV store
    await kv.set(productId, updatedProduct);
    
    console.log('[Product Management] ✅ Product updated successfully:', productId);
    console.log('[Product Management] Updated fields:', {
      name: updatedProduct.name,
      category: updatedProduct.category,
      price: updatedProduct.price,
      stock: updatedProduct.stock,
      status: updatedProduct.status
    });

    return c.json({ 
      success: true, 
      data: updatedProduct,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('[Product Management] Error updating product:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// DELETE /products/:id - Delete a product
app.delete('/make-server-a278ea32/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    console.log('[Product Management] 🗑️ DELETE REQUEST for product:', productId);
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      console.error('[Product Management] ❌ Unauthorized product deletion attempt');
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Validate product ID format
    if (!productId || !productId.startsWith('product_')) {
      console.error('[Product Management] ❌ Invalid product ID format:', productId);
      return c.json({ 
        success: false, 
        error: 'Invalid product ID format' 
      }, 400);
    }

    // Check if product exists BEFORE attempting deletion
    const existingProduct = await kv.get(productId);
    if (!existingProduct) {
      console.log('[Product Management] ⚠️ Product not found for deletion:', productId);
      return c.json({ 
        success: false, 
        error: 'Product not found',
        productId 
      }, 404);
    }

    // Log product details before deletion (for audit trail)
    console.log('[Product Management] 📋 Product to be deleted:', {
      id: existingProduct.id,
      name: existingProduct.name,
      category: existingProduct.category,
      price: existingProduct.price,
      stock: existingProduct.stock,
      createdAt: existingProduct.createdAt,
      createdBy: existingProduct.createdBy
    });

    // CRITICAL: Delete from KV store
    await kv.del(productId);
    
    // Verify deletion was successful
    const verifyDeleted = await kv.get(productId);
    if (verifyDeleted) {
      console.error('[Product Management] ❌ DELETION FAILED - Product still exists:', productId);
      return c.json({ 
        success: false, 
        error: 'Failed to delete product - deletion did not complete',
        productId 
      }, 500);
    }

    console.log('[Product Management] ✅ Product deleted successfully:', productId);
    console.log('[Product Management] Deleted product name:', existingProduct.name);

    return c.json({ 
      success: true, 
      message: 'Product deleted successfully',
      deletedProduct: {
        id: existingProduct.id,
        name: existingProduct.name
      }
    });

  } catch (error) {
    console.error('[Product Management] ❌ Error deleting product:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to delete product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// PATCH /products/:id/stock - Update product stock level
app.patch('/make-server-a278ea32/products/:id/stock', async (c) => {
  try {
    const productId = c.req.param('id');
    console.log('[Product Management] 📦 Updating stock for product:', productId);
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      console.error('[Product Management] ❌ Unauthorized stock update attempt');
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Validate product ID format
    if (!productId || !productId.startsWith('product_')) {
      console.error('[Product Management] ❌ Invalid product ID format:', productId);
      return c.json({ 
        success: false, 
        error: 'Invalid product ID format' 
      }, 400);
    }

    // Check if product exists
    const existingProduct = await kv.get(productId);
    if (!existingProduct) {
      console.log('[Product Management] ⚠️ Product not found for stock update:', productId);
      return c.json({ 
        success: false, 
        error: 'Product not found',
        productId 
      }, 404);
    }

    // Parse request body
    const body = await c.req.json();
    const { operation, amount } = body;

    // Validate required fields
    if (!operation || amount === undefined || amount === null) {
      console.error('[Product Management] ❌ Missing required fields:', { operation, amount });
      return c.json({ 
        success: false, 
        error: 'Missing required fields: operation and amount are required' 
      }, 400);
    }

    // Validate operation type
    const validOperations = ['set', 'increment', 'decrement'];
    if (!validOperations.includes(operation)) {
      console.error('[Product Management] ❌ Invalid operation:', operation);
      return c.json({ 
        success: false, 
        error: `Invalid operation. Must be one of: ${validOperations.join(', ')}` 
      }, 400);
    }

    // Validate amount is a number
    const stockAmount = parseInt(amount);
    if (isNaN(stockAmount)) {
      console.error('[Product Management] ❌ Invalid amount - not a number:', amount);
      return c.json({ 
        success: false, 
        error: 'Amount must be a valid number' 
      }, 400);
    }

    // Calculate new stock based on operation
    let newStock = 0;
    const currentStock = existingProduct.stock || 0;

    switch (operation) {
      case 'set':
        // Set stock to absolute value (must be non-negative)
        if (stockAmount < 0) {
          console.error('[Product Management] ❌ Cannot set negative stock:', stockAmount);
          return c.json({ 
            success: false, 
            error: 'Stock cannot be negative. Use 0 for out of stock.' 
          }, 400);
        }
        newStock = stockAmount;
        console.log('[Product Management] Setting stock to:', newStock);
        break;

      case 'increment':
        // Add to current stock (amount must be positive)
        if (stockAmount < 0) {
          console.error('[Product Management] ❌ Cannot increment by negative amount:', stockAmount);
          return c.json({ 
            success: false, 
            error: 'Increment amount must be positive. Use decrement operation for reduction.' 
          }, 400);
        }
        newStock = currentStock + stockAmount;
        console.log('[Product Management] Incrementing stock:', currentStock, '+', stockAmount, '=', newStock);
        break;

      case 'decrement':
        // Subtract from current stock (amount must be positive, result cannot be negative)
        if (stockAmount < 0) {
          console.error('[Product Management] ❌ Cannot decrement by negative amount:', stockAmount);
          return c.json({ 
            success: false, 
            error: 'Decrement amount must be positive. Use increment operation for addition.' 
          }, 400);
        }
        newStock = Math.max(0, currentStock - stockAmount); // Prevent negative stock
        if (currentStock - stockAmount < 0) {
          console.warn('[Product Management] ⚠️ Decrement would result in negative stock, capping at 0');
        }
        console.log('[Product Management] Decrementing stock:', currentStock, '-', stockAmount, '=', newStock);
        break;
    }

    // Auto-update derived fields based on new stock
    const updatedInStock = newStock > 0;
    const updatedStatus = newStock === 0 ? 'out_of_stock' : 'active';

    // Create updated product object
    const updatedProduct = {
      ...existingProduct,
      stock: newStock,
      inStock: updatedInStock,
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    };

    // Save updated product to KV store
    await kv.set(productId, updatedProduct);
    
    console.log('[Product Management] ✅ Stock updated successfully:', productId);
    console.log('[Product Management] Stock change:', {
      operation,
      amount: stockAmount,
      oldStock: currentStock,
      newStock: newStock,
      inStock: updatedInStock,
      status: updatedStatus
    });

    return c.json({ 
      success: true, 
      data: updatedProduct,
      message: 'Stock updated successfully',
      stockChange: {
        operation,
        amount: stockAmount,
        previousStock: currentStock,
        newStock: newStock
      }
    });

  } catch (error) {
    console.error('[Product Management] ❌ Error updating stock:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update stock',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /admin/analytics/top-episodes
// Returns top performing episodes (sorted by views)
app.get('/make-server-a278ea32/admin/analytics/top-episodes', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching top episodes...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    const limit = parseInt(c.req.query('limit') || '10');
    
    // Get all published episodes
    const allEpisodes = await kv.getByPrefix('managed_episode_') || [];
    const publishedEpisodes = allEpisodes.filter(ep => ep.status === 'published');
    
    // Sort by views (descending) and take top N
    const topEpisodes = publishedEpisodes
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit)
      .map(ep => ({
        id: ep.id,
        title: ep.title,
        plays: ep.views || 0,  // Using views as plays for now
        likes: ep.likes || 0,
        comments: ep.comments || 0,
        shares: ep.shares || 0,
        duration: ep.duration,
        publishedDate: ep.publishedDate,
        isVipOnly: ep.isVipOnly,
        category: ep.category
      }));
    
    console.log(`[Admin Analytics] Retrieved ${topEpisodes.length} top episodes`);
    return c.json({ success: true, data: topEpisodes });
  } catch (error) {
    console.error('[Admin Analytics] Error fetching top episodes:', error);
    return c.json({ success: false, error: 'Failed to fetch top episodes' }, 500);
  }
});

// GET /admin/analytics/top-tippers
// Returns top tippers (users who have given the most tips)
app.get('/make-server-a278ea32/admin/analytics/top-tippers', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching top tippers...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    const limit = parseInt(c.req.query('limit') || '10');
    
    // Get all tips
    const allTips = await kv.getByPrefix('tip_') || [];
    
    // Group tips by user
    const tipperMap = new Map();
    
    for (const tip of allTips) {
      const userId = tip.fromUserId || 'anonymous';
      const userName = tip.fromUserName || 'Anonymous User';
      const amount = tip.amount || 0;
      
      if (tipperMap.has(userId)) {
        const existing = tipperMap.get(userId);
        existing.totalTipped += amount;
        existing.tipCount += 1;
        existing.lastTip = tip.timestamp;
      } else {
        tipperMap.set(userId, {
          id: userId,
          name: userName,
          totalTipped: amount,
          tipCount: 1,
          lastTip: tip.timestamp
        });
      }
    }
    
    // Convert map to array and sort by total tipped
    const topTippers = Array.from(tipperMap.values())
      .sort((a, b) => b.totalTipped - a.totalTipped)
      .slice(0, limit)
      .map(tipper => ({
        ...tipper,
        lastTip: new Date(tipper.lastTip).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      }));
    
    console.log(`[Admin Analytics] Retrieved ${topTippers.length} top tippers`);
    return c.json({ success: true, data: topTippers });
  } catch (error) {
    console.error('[Admin Analytics] Error fetching top tippers:', error);
    return c.json({ success: false, error: 'Failed to fetch top tippers' }, 500);
  }
});

// GET /admin/analytics/users - User analytics and metrics
app.get('/make-server-a278ea32/admin/analytics/users', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching user analytics...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    // Get all users from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('[Admin Analytics] Error fetching users from auth:', authError);
      return c.json({ success: false, error: 'Failed to fetch users' }, 500);
    }
    
    const allUsers = authData?.users || [];
    
    // Calculate total users
    const totalUsers = allUsers.length;
    
    // Calculate active users (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsers = allUsers.filter(u => 
      u.last_sign_in_at && u.last_sign_in_at > thirtyDaysAgo
    ).length;
        
    // Calculate new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const newUsersToday = allUsers.filter(u => 
      u.created_at >= todayISO
    ).length;
    
    // Get VIP subscribers from KV store
    const vipSubs = await kv.getByPrefix('vip_subscription_') || [];
    const vipSubscribers = vipSubs.filter(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    ).length;
    
    // Get episode analytics for completion rate calculation
    const episodeAnalytics = await kv.getByPrefix('episode_analytics_') || [];
    
    // Calculate average completion rate
    let totalCompletion = 0;
    let episodesWithCompletion = 0;
    episodeAnalytics.forEach(analytics => {
      if (analytics.averageCompletionRate && analytics.averageCompletionRate > 0) {
        totalCompletion += analytics.averageCompletionRate;
        episodesWithCompletion++;
      }
    });
    const averageCompletion = episodesWithCompletion > 0 
      ? Math.round(totalCompletion / episodesWithCompletion) 
      : 0;
    
    // Calculate average session duration from listen time
    let totalListenTime = 0;
    let totalPlays = 0;
    episodeAnalytics.forEach(analytics => {
      totalListenTime += analytics.totalListenTime || 0;
      totalPlays += analytics.totalPlays || 0;
    });
    const averageSessionDuration = totalPlays > 0 
      ? Math.round(totalListenTime / totalPlays / 60) // Convert seconds to minutes
      : 0;
    
    // Calculate user growth trend (last 7 days)
    const userGrowthTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const usersOnDay = allUsers.filter(u => {
        const createdAt = new Date(u.created_at);
        return createdAt >= date && createdAt < nextDate;
      }).length;
      
      userGrowthTrend.push({
        date: date.toISOString().split('T')[0],
        newUsers: usersOnDay
      });
    }
    
    // Calculate activity breakdown
    const activityBreakdown = {
      veryActive: allUsers.filter(u => {
        if (!u.last_sign_in_at) return false;
        const daysSinceLastSignIn = (Date.now() - new Date(u.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastSignIn <= 7;
      }).length,
      active: allUsers.filter(u => {
        if (!u.last_sign_in_at) return false;
        const daysSinceLastSignIn = (Date.now() - new Date(u.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastSignIn > 7 && daysSinceLastSignIn <= 30;
      }).length,
      inactive: allUsers.filter(u => {
        if (!u.last_sign_in_at) return true; // Never signed in
        const daysSinceLastSignIn = (Date.now() - new Date(u.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastSignIn > 30;
      }).length
    };
    
    const userAnalytics = {
      totalUsers,
      activeUsers,
      newUsersToday,
      vipSubscribers,
      averageCompletion,
      averageSessionDuration,
      userGrowthTrend,
      activityBreakdown
    };
    
    console.log('[Admin Analytics] User analytics generated successfully:', {
      totalUsers,
      activeUsers,
      newUsersToday,
      vipSubscribers
    });
    
    return c.json({ success: true, data: userAnalytics });
    
  } catch (error) {
    console.error('[Admin Analytics] Error fetching user analytics:', error);
    return c.json({ success: false, error: 'Failed to fetch user analytics' }, 500);
  }
});

// GET /admin/analytics/revenue-trends - Revenue trends over time
app.get('/make-server-a278ea32/admin/analytics/revenue-trends', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching revenue trends...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    const days = parseInt(c.req.query('days') || '30'); // Default 30 days
    
    // Get all tips from KV store
    const allTips = await kv.getByPrefix('tip_') || [];
    
    // Get all VIP subscriptions
    const allSubs = await kv.getByPrefix('vip_subscription_') || [];
    
    // Get all store orders
    const allOrders = await kv.getByPrefix('store_order_') || [];
    
    // Generate time-series data
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Calculate tips for this day
      const tipsThisDay = allTips.filter(tip => {
        const tipDate = new Date(tip.timestamp || tip.createdAt);
        return tipDate >= date && tipDate < nextDate;
      }).reduce((sum, tip) => sum + (tip.amount || 0), 0);
      
      // Calculate subscription revenue for this day
      // Note: This counts new subscriptions on this day
      const subsThisDay = allSubs.filter(sub => {
        const subDate = new Date(sub.createdAt);
        return subDate >= date && subDate < nextDate && (sub.status === 'active' || sub.status === 'trialing');
      }).length * 20; // AED 20/month per subscription
      
      // Calculate store sales for this day
      const storeThisDay = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= date && orderDate < nextDate && order.status === 'completed';
      }).reduce((sum, order) => sum + (order.total || 0), 0);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tips: tipsThisDay,
        subscriptions: subsThisDay,
        store: storeThisDay,
        total: tipsThisDay + subsThisDay + storeThisDay
      });
    }
    
    console.log('[Admin Analytics] Revenue trends generated:', {
      days,
      dataPoints: trends.length,
      totalRevenue: trends.reduce((sum, t) => sum + t.total, 0)
    });
    
    return c.json({ success: true, data: trends });
    
  } catch (error) {
    console.error('[Admin Analytics] Error fetching revenue trends:', error);
    return c.json({ success: false, error: 'Failed to fetch revenue trends' }, 500);
  }
});

// GET /admin/analytics/engagement-trends - Engagement trends over time
app.get('/make-server-a278ea32/admin/analytics/engagement-trends', async (c) => {
  try {
    console.log('[Admin Analytics] Fetching engagement trends...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }

    const days = parseInt(c.req.query('days') || '30'); // Default 30 days
    
    // Get all episode analytics
    const allEpisodeAnalytics = await kv.getByPrefix('episode_analytics_') || [];
    
    // Get all likes tracking
    const allLikes = await kv.getByPrefix('like_') || [];
    
    // Get all shares tracking
    const allShares = await kv.getByPrefix('share_') || [];
    
    // Generate time-series data
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Count likes for this day
      const likesThisDay = allLikes.filter(like => {
        const likeDate = new Date(like.timestamp || like.createdAt);
        return likeDate >= date && likeDate < nextDate && like.liked;
      }).length;
      
      // Count shares for this day
      const sharesThisDay = allShares.filter(share => {
        const shareDate = new Date(share.timestamp || share.createdAt);
        return shareDate >= date && shareDate < nextDate;
      }).length;
      
      // Comments (placeholder for future implementation)
      const commentsThisDay = 0; // Will be implemented with comment system
      
      trends.push({
        date: date.toISOString().split('T')[0],
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        likes: likesThisDay,
        shares: sharesThisDay,
        comments: commentsThisDay,
        total: likesThisDay + sharesThisDay + commentsThisDay
      });
    }
    
    console.log('[Admin Analytics] Engagement trends generated:', {
      days,
      dataPoints: trends.length,
      totalEngagement: trends.reduce((sum, t) => sum + t.total, 0)
    });
    
    return c.json({ success: true, data: trends });
    
  } catch (error) {
    console.error('[Admin Analytics] Error fetching engagement trends:', error);
    return c.json({ success: false, error: 'Failed to fetch engagement trends' }, 500);
  }
});

console.log('✅ Admin analytics routes added successfully');
console.log('✅ Admin time-series analytics routes added successfully');

// ========================= PHASE 3: ENHANCED EPISODE ANALYTICS WITH TIME-SERIES =========================

// GET /analytics/episode/:episodeId/detailed - Enhanced analytics with time-series data
app.get('/make-server-a278ea32/analytics/episode/:episodeId/detailed', async (c) => {
  try {
    const episodeId = c.req.param('episodeId');
    const timeRange = c.req.query('timeRange') || '7d'; // 7d, 30d, 90d, all
    
    console.log('[Enhanced Analytics] Fetching detailed analytics for episode:', episodeId, 'timeRange:', timeRange);
    
    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 };
    const days = daysMap[timeRange] || 7;
    
    // Get base analytics
    const analyticsKey = `episode_analytics_${episodeId}`;
    const metricsKey = `episode_metrics_${episodeId}`;
    
    const [analytics, metrics] = await Promise.all([
      kv.get(analyticsKey),
      kv.get(metricsKey)
    ]);
    
    // Get all tracking data for time-series
    const allPlayKeys = await kv.getByPrefix(`analytics_play_${episodeId}_`);
    const allEngagementKeys = await kv.getByPrefix(`analytics_engagement_${episodeId}_`);
    const allViewKeys = await kv.getByPrefix(`episode_view_${episodeId}_`);
    
    // Build time-series data (daily aggregation)
    const timeSeriesMap = new Map();
    
    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      timeSeriesMap.set(dateStr, {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: date.getTime(),
        plays: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      });
    }
    
    // Aggregate plays
    allPlayKeys.forEach(play => {
      try {
        const date = new Date(play.timestamp || Date.now());
        const dateStr = date.toISOString().split('T')[0];
        if (timeSeriesMap.has(dateStr)) {
          timeSeriesMap.get(dateStr).plays++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    // Aggregate engagements
    allEngagementKeys.forEach(engagement => {
      try {
        const date = new Date(engagement.timestamp || Date.now());
        const dateStr = date.toISOString().split('T')[0];
        if (timeSeriesMap.has(dateStr)) {
          if (engagement.action === 'like') timeSeriesMap.get(dateStr).likes++;
          if (engagement.action === 'comment') timeSeriesMap.get(dateStr).comments++;
          if (engagement.action === 'share') timeSeriesMap.get(dateStr).shares++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    // Aggregate views
    allViewKeys.forEach(view => {
      try {
        const date = new Date(view.timestamp || Date.now());
        const dateStr = date.toISOString().split('T')[0];
        if (timeSeriesMap.has(dateStr)) {
          timeSeriesMap.get(dateStr).views++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    // Convert to array and sort by date
    const timeSeries = Array.from(timeSeriesMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Device breakdown
    const deviceCounts = {};
    allPlayKeys.forEach(play => {
      const device = play.deviceType || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    
    const totalDeviceCount = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0);
    const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => ({
      device,
      count,
      percentage: totalDeviceCount > 0 ? (count / totalDeviceCount) * 100 : 0
    }));
    
    // Hourly breakdown
    const hourlyCounts = {};
    for (let i = 0; i < 24; i++) hourlyCounts[i] = 0;
    
    allPlayKeys.forEach(play => {
      try {
        const date = new Date(play.timestamp || Date.now());
        const hour = date.getHours();
        if (hour >= 0 && hour < 24) {
          hourlyCounts[hour]++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    const hourlyBreakdown = Object.entries(hourlyCounts).map(([hour, plays]) => ({
      hour: parseInt(hour),
      plays
    }));
    
    // Calculate metrics
    const totalViews = metrics?.totalViews || 0;
    const totalPlays = analytics?.totalPlays || 0;
    const totalLikes = metrics?.totalLikes || 0;
    const totalComments = metrics?.totalComments || 0;
    const totalShares = metrics?.totalShares || 0;
    
    const avgListenDuration = analytics?.averageListenDuration || 0;
    const completionRate = analytics?.completionRate || 0;
    
    const result = {
      totalViews,
      totalPlays,
      totalLikes,
      totalComments,
      totalShares,
      avgListenDuration,
      completionRate,
      timeSeries,
      deviceBreakdown,
      hourlyBreakdown
    };
    
    console.log('[Enhanced Analytics] Analytics retrieved successfully with', timeSeries.length, 'time series points');
    return c.json(result);
  } catch (error) {
    console.error('[Enhanced Analytics] Error getting episode analytics:', error);
    return c.json({ success: false, error: 'Failed to get analytics' }, 500);
  }
});

console.log('✅ Phase 3: Enhanced analytics endpoints added successfully');

// ============================================
// 🛒 PHASE 2A-2: ORDER MANAGEMENT ROUTES
// ============================================
console.log('📦 Initializing Phase 2A-2: Order Management Routes...');

// Helper function to generate unique order IDs
// Format: ORD-YYYYMMDD-RANDOM (e.g., ORD-20260214-A1B2C3)
function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate random 6-character alphanumeric string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `ORD-${dateStr}-${randomStr}`;
}

// Helper function to validate order data
function validateOrderData(orderData: any): { valid: boolean; error?: string } {
  if (!orderData) {
    return { valid: false, error: 'Order data is required' };
  }
  
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    return { valid: false, error: 'Order must contain at least one item' };
  }
  
  if (!orderData.shippingAddress) {
    return { valid: false, error: 'Shipping address is required' };
  }
  
  const requiredAddressFields = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'country'];
  for (const field of requiredAddressFields) {
    if (!orderData.shippingAddress[field]) {
      return { valid: false, error: `Shipping address ${field} is required` };
    }
  }
  
  if (typeof orderData.total !== 'number' || orderData.total <= 0) {
    return { valid: false, error: 'Invalid order total' };
  }
  
  if (!orderData.currency || !['USD', 'AED'].includes(orderData.currency)) {
    return { valid: false, error: 'Invalid currency' };
  }
  
  return { valid: true };
}

// POST /orders - Create a new order
app.post('/make-server-a278ea32/orders', async (c) => {
  try {
    console.log('[Order Management] 📝 Creating new order...');
    
    const orderData = await c.req.json();
    console.log('[Order Management] Order data received:', {
      itemCount: orderData.items?.length,
      total: orderData.total,
      currency: orderData.currency,
      userId: orderData.userId
    });
    
    // Validate order data
    const validation = validateOrderData(orderData);
    if (!validation.valid) {
      console.error('[Order Management] ❌ Validation failed:', validation.error);
      return c.json({ 
        success: false, 
        error: validation.error 
      }, 400);
    }
    
    // Generate unique order ID
    const orderId = generateOrderId();
    console.log('[Order Management] 🆔 Generated order ID:', orderId);
    
    // Prepare order object
    const order = {
      orderId,
      orderNumber: orderId, // Same as orderId for now
      userId: orderData.userId || null,
      userEmail: orderData.userEmail || orderData.shippingAddress.email,
      status: 'pending',
      items: orderData.items,
      shippingAddress: orderData.shippingAddress,
      subtotal: orderData.subtotal,
      shipping: orderData.shipping,
      tax: orderData.tax,
      total: orderData.total,
      currency: orderData.currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store order in KV store
    const orderKey = `order_${orderId}`;
    await kv.set(orderKey, order);
    console.log('[Order Management] 💾 Order stored with key:', orderKey);
    
    // If user is logged in, add order to their order list
    if (orderData.userId) {
      const userOrdersKey = `user_orders_${orderData.userId}`;
      
      // Get existing user orders
      let userOrders = await kv.get(userOrdersKey) || [];
      
      // Add new order ID to the beginning of the array (most recent first)
      userOrders.unshift(orderId);
      
      // Store updated user orders list
      await kv.set(userOrdersKey, userOrders);
      console.log('[Order Management] 👤 Order added to user order history:', orderData.userId);
    }
    
    // Update product stock quantities (decrement)
    console.log('[Order Management] 📦 Updating product stock...');
    for (const item of orderData.items) {
      try {
        const productKey = `product_${item.productId}`;
        const product = await kv.get(productKey);
        
        if (product && product.stock !== undefined) {
          const newStock = Math.max(0, product.stock - item.quantity);
          product.stock = newStock;
          product.updatedAt = new Date().toISOString();
          
          await kv.set(productKey, product);
          console.log(`[Order Management] 📉 Product ${item.productId} stock updated: ${product.stock + item.quantity} → ${newStock}`);
        }
      } catch (stockError) {
        console.error(`[Order Management] ⚠️ Failed to update stock for product ${item.productId}:`, stockError);
        // Continue with order creation even if stock update fails
      }
    }
    
    console.log('[Order Management] ✅ Order created successfully:', orderId);
    
    return c.json({
      success: true,
      order: {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt
      },
      message: 'Order created successfully'
    });
    
  } catch (error) {
    console.error('[Order Management] ❌ Error creating order:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create order',
      details: error.message 
    }, 500);
  }
});

// GET /orders/:orderId - Get a specific order by ID
app.get('/make-server-a278ea32/orders/:orderId', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    console.log('[Order Management] 📋 Fetching order:', orderId);
    
    // Get order from KV store
    const orderKey = `order_${orderId}`;
    const order = await kv.get(orderKey);
    
    if (!order) {
      console.log('[Order Management] ❌ Order not found:', orderId);
      return c.json({ 
        success: false, 
        error: 'Order not found' 
      }, 404);
    }
    
    // Optional: Verify user has access to this order
    // For now, we'll allow anyone with the order ID to view it
    // In production, you might want to check if the user owns this order
    
    console.log('[Order Management] ✅ Order retrieved:', orderId);
    return c.json({
      success: true,
      order
    });
    
  } catch (error) {
    console.error('[Order Management] ❌ Error fetching order:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch order',
      details: error.message 
    }, 500);
  }
});

// GET /orders/user/:userId - Get all orders for a specific user
app.get('/make-server-a278ea32/orders/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log('[Order Management] 📋 Fetching orders for user:', userId);
    
    // Optional: Verify the requesting user matches the userId
    // For MVP, we'll allow it without strict auth check
    
    // Get user's order IDs
    const userOrdersKey = `user_orders_${userId}`;
    const orderIds = await kv.get(userOrdersKey) || [];
    
    if (orderIds.length === 0) {
      console.log('[Order Management] ℹ️ No orders found for user:', userId);
      return c.json({
        success: true,
        orders: [],
        total: 0
      });
    }
    
    // Fetch all orders
    const orders = [];
    for (const orderId of orderIds) {
      const orderKey = `order_${orderId}`;
      const order = await kv.get(orderKey);
      if (order) {
        orders.push(order);
      }
    }
    
    console.log('[Order Management] ✅ Retrieved', orders.length, 'orders for user:', userId);
    return c.json({
      success: true,
      orders,
      total: orders.length
    });
    
  } catch (error) {
    console.error('[Order Management] ❌ Error fetching user orders:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch user orders',
      details: error.message 
    }, 500);
  }
});

// GET /orders - Get all orders (Admin only)
app.get('/make-server-a278ea32/orders', async (c) => {
  try {
    console.log('[Order Management] 📋 Fetching all orders (Admin)...');
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }
    
    // Get all entries with 'order_' prefix from KV store
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    const { data: rawOrders, error: queryError } = await supabase
      .from('kv_store_a278ea32')
      .select('key, value')
      .like('key', 'order_ORD-%');
    
    if (queryError) {
      throw new Error(queryError.message);
    }
    
    console.log('[Order Management] 📊 Raw query returned:', rawOrders?.length || 0, 'entries');
    
    // Map and sort by date
    const orders = (rawOrders || [])
      .map((item: any) => item.value)
      .sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    console.log('[Order Management] ✅ Retrieved', orders.length, 'total orders');
    
    return c.json({
      success: true,
      orders,
      total: orders.length
    });
    
  } catch (error) {
    console.error('[Order Management] ❌ Error fetching all orders:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch orders',
      details: error.message 
    }, 500);
  }
});

// PATCH /orders/:orderId/status - Update order status (Admin only)
app.patch('/make-server-a278ea32/orders/:orderId/status', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    console.log('[Order Management] 📝 Updating order status:', orderId);
    
    // Verify admin access
    const auth = await verifyAdminAccess(c);
    if (!auth.authorized) {
      return c.json({ success: false, error: auth.error }, auth.status);
    }
    
    const { status } = await c.req.json();
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return c.json({ 
        success: false, 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      }, 400);
    }
    
    // Get order
    const orderKey = `order_${orderId}`;
    const order = await kv.get(orderKey);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    // Update status
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    await kv.set(orderKey, order);
    
    console.log('[Order Management] ✅ Order status updated:', orderId, '→', status);
    
    return c.json({
      success: true,
      order,
      message: 'Order status updated successfully'
    });
    
  } catch (error) {
    console.error('[Order Management] ❌ Error updating order status:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update order status',
      details: error.message 
    }, 500);
  }
});

console.log('✅ Phase 2A-2: Order Management Routes initialized successfully');
console.log('📦 Available order endpoints:');
console.log('  - POST /make-server-a278ea32/orders (Create order)');
console.log('  - GET /make-server-a278ea32/orders/:orderId (Get order by ID)');
console.log('  - GET /make-server-a278ea32/orders/user/:userId (Get user orders)');
console.log('  - GET /make-server-a278ea32/orders (Get all orders - Admin)');
console.log('  - PATCH /make-server-a278ea32/orders/:orderId/status (Update status - Admin)');

// ============================================================================
// WELLNESS — Calendar events, Guide posts, Bestie waitlist
// ============================================================================
// Events and guides are curated by the admin in the dashboard and shown on Home.
// Each item is its own KV entry (wellness:event:<id> / wellness:guide:<id>).

const WELLNESS_KINDS: Record<string, { prefix: string; fields: string[] }> = {
  events: {
    prefix: 'wellness:event:',
    fields: ['title', 'date', 'startTime', 'location', 'category', 'description', 'link', 'image', 'partner'],
  },
  guides: {
    prefix: 'wellness:guide:',
    fields: ['title', 'category', 'note', 'image', 'link'],
  },
  // Stepsisters community activities: upcoming meetups + photo recaps
  moments: {
    prefix: 'wellness:moment:',
    fields: ['title', 'date', 'startTime', 'location', 'type', 'description', 'link'],
  },
};

function wellnessPick(body: any, fields: string[]) {
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (typeof body?.[f] === 'string') out[f] = body[f].trim();
  }
  if (typeof body?.pinned === 'boolean') out.pinned = body.pinned;
  if (Array.isArray(body?.photos)) out.photos = body.photos.filter((u: any) => typeof u === 'string' && u).slice(0, 12);
  return out;
}

async function wellnessAdmin(c: any) {
  const user = await socialUser(c);
  if (!user) return { error: c.json({ success: false, error: 'Unauthorized' }, 401) };
  if (!socialIsAdmin(user)) return { error: c.json({ success: false, error: 'Admin access required' }, 403) };
  return { user };
}

// Admin: upload a photo for the calendar, guide or Stepsisters (public bucket, permanent URL)
const WELLNESS_BUCKET = 'make-a278ea32-wellness';
app.post('/make-server-a278ea32/wellness/upload', async (c) => {
  try {
    const auth = await wellnessAdmin(c);
    if (auth.error) return auth.error;
    const form = await c.req.formData();
    const file = form.get('file') as File | null;
    if (!file) return c.json({ success: false, error: 'No file' }, 400);
    if (file.size > 8 * 1024 * 1024) return c.json({ success: false, error: 'Photo is larger than 8MB' }, 400);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === WELLNESS_BUCKET)) {
      await supabase.storage.createBucket(WELLNESS_BUCKET, { public: true });
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(WELLNESS_BUCKET)
      .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type || 'image/jpeg' });
    if (error) return c.json({ success: false, error: error.message }, 500);
    const { data } = supabase.storage.from(WELLNESS_BUCKET).getPublicUrl(path);
    return c.json({ success: true, data: { url: data.publicUrl } });
  } catch (error: any) {
    console.error('[Wellness] upload failed:', error);
    return c.json({ success: false, error: error?.message || 'Upload failed' }, 500);
  }
});

for (const [kind, { prefix, fields }] of Object.entries(WELLNESS_KINDS)) {
  // Public: list
  app.get(`/make-server-a278ea32/wellness/${kind}`, async (c) => {
    try {
      const items = ((await kv.getByPrefix(prefix)) || []).filter(Boolean);
      return c.json({ success: true, data: items });
    } catch (error: any) {
      console.error(`[Wellness] Error listing ${kind}:`, error.message);
      return c.json({ success: false, error: `Failed to load ${kind}` }, 500);
    }
  });

  // Admin: create
  app.post(`/make-server-a278ea32/wellness/${kind}`, async (c) => {
    try {
      const auth = await wellnessAdmin(c);
      if (auth.error) return auth.error;
      const body = await c.req.json();
      const data = wellnessPick(body, fields);
      if (!data.title) return c.json({ success: false, error: 'Title is required' }, 400);
      if (kind === 'events' && !data.date) return c.json({ success: false, error: 'Date is required' }, 400);
      const now = new Date().toISOString();
      const item = { id: crypto.randomUUID(), ...data, pinned: !!data.pinned, createdAt: now, updatedAt: now };
      await kv.set(`${prefix}${item.id}`, item);
      return c.json({ success: true, data: item });
    } catch (error: any) {
      console.error(`[Wellness] Error creating ${kind}:`, error.message);
      return c.json({ success: false, error: `Failed to create item` }, 500);
    }
  });

  // Admin: update
  app.put(`/make-server-a278ea32/wellness/${kind}/:id`, async (c) => {
    try {
      const auth = await wellnessAdmin(c);
      if (auth.error) return auth.error;
      const id = c.req.param('id');
      const existing = await kv.get(`${prefix}${id}`);
      if (!existing) return c.json({ success: false, error: 'Not found' }, 404);
      const body = await c.req.json();
      const item = { ...existing, ...wellnessPick(body, fields), updatedAt: new Date().toISOString() };
      await kv.set(`${prefix}${id}`, item);
      return c.json({ success: true, data: item });
    } catch (error: any) {
      console.error(`[Wellness] Error updating ${kind}:`, error.message);
      return c.json({ success: false, error: `Failed to update item` }, 500);
    }
  });

  // Admin: delete
  app.delete(`/make-server-a278ea32/wellness/${kind}/:id`, async (c) => {
    try {
      const auth = await wellnessAdmin(c);
      if (auth.error) return auth.error;
      await kv.del(`${prefix}${c.req.param('id')}`);
      return c.json({ success: true });
    } catch (error: any) {
      console.error(`[Wellness] Error deleting ${kind}:`, error.message);
      return c.json({ success: false, error: `Failed to delete item` }, 500);
    }
  });
}

// Signed-in users: join the Wellness Bestie waitlist
app.post('/make-server-a278ea32/waitlist/bestie', async (c) => {
  try {
    const user = await socialUser(c);
    if (!user) return c.json({ success: false, error: 'Please log in to join the waitlist' }, 401);
    const key = `waitlist:bestie:${user.id}`;
    const existing = await kv.get(key);
    if (!existing) {
      await kv.set(key, { userId: user.id, email: user.email, joinedAt: new Date().toISOString() });
    }
    return c.json({ success: true, data: { joined: true, alreadyJoined: !!existing } });
  } catch (error: any) {
    console.error('[Wellness] Error joining waitlist:', error.message);
    return c.json({ success: false, error: 'Failed to join waitlist' }, 500);
  }
});

// Admin: waitlist size
app.get('/make-server-a278ea32/waitlist/bestie', async (c) => {
  try {
    const auth = await wellnessAdmin(c);
    if (auth.error) return auth.error;
    const entries = ((await kv.getByPrefix('waitlist:bestie:')) || []).filter(Boolean);
    return c.json({ success: true, data: { count: entries.length } });
  } catch (error: any) {
    return c.json({ success: false, error: 'Failed to read waitlist' }, 500);
  }
});

// ── Plan my day: "Keep your spot" sign-ups, emailed from account@oriri.me ──
const SMTP = {
  host: Deno.env.get('SMTP_HOST') || 'mail.oriri.me',
  port: Number(Deno.env.get('SMTP_PORT') || 465),
  user: Deno.env.get('SMTP_USER') || 'account@oriri.me',
  from: 'Oriri <account@oriri.me>',
  notify: 'account@oriri.me',
};
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

async function sendMail(to: string, subject: string, text: string, html: string) {
  const pass = Deno.env.get('SMTP_PASS');
  if (!pass) throw new Error('SMTP_PASS not set');
  const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');
  const client = new SMTPClient({
    connection: { hostname: SMTP.host, port: SMTP.port, tls: SMTP.port === 465, auth: { username: SMTP.user, password: pass } },
  });
  try {
    await client.send({ from: SMTP.from, to, subject, content: text, html });
  } finally {
    await client.close();
  }
}

app.post('/make-server-a278ea32/plan/signup', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
      return c.json({ success: false, error: 'Please enter a valid email address.' }, 400);
    }
    if (body.consent !== true) return c.json({ success: false, error: 'Please tick the consent box.' }, 400);

    // Simple abuse guard: one email per address every 10 minutes
    const key = `plan:signup:${email}`;
    const prev: any = await kv.get(key);
    if (prev?.lastSentAt && Date.now() - new Date(prev.lastSentAt).getTime() < 10 * 60 * 1000) {
      return c.json({ success: true, data: { duplicate: true } });
    }

    const plan = (Array.isArray(body.plan) ? body.plan : []).slice(0, 12).map((r: any) => ({
      time: String(r.time || '').slice(0, 12), title: String(r.title || '').slice(0, 120), detail: String(r.detail || '').slice(0, 60),
    }));
    const record = {
      email,
      feeling: String(body.feeling || '').slice(0, 40),
      energy: Number(body.energy) || null,
      sharpest: String(body.sharpest || '').slice(0, 40),
      plan,
      consent: true,
      createdAt: prev?.createdAt || new Date().toISOString(),
      lastSentAt: new Date().toISOString(),
    };
    await kv.set(key, record);

    const rowsText = plan.map((r: any) => `${r.time}  ${r.title}${r.detail ? ` (${r.detail})` : ''}`).join('\n');
    const rowsHtml = plan.map((r: any) =>
      `<tr><td style="padding:8px 12px 8px 0;color:#8A7378;font-size:13px;white-space:nowrap;vertical-align:top">${esc(r.time)}</td><td style="padding:8px 0;font-size:15px;color:#4E3B40">${esc(r.title)}<div style="font-size:12px;color:#8A7378">${esc(r.detail)}</div></td></tr>`).join('');
    const text = `Your spot is saved.\n\nYour ${record.feeling} day\nSharpest: ${record.sharpest} · Energy ${record.energy}/10\n\n${rowsText}\n\nPlans are suggestions based on your answers, not medical advice.\n\nOriri · Rising Better Together · https://oriri.me`;
    const html = `<div style="background:#FBF6F4;padding:32px 16px;font-family:Georgia,serif"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:24px;padding:32px;border:1px solid #EFE3DF">
<p style="letter-spacing:.28em;font-size:20px;color:#4E3B40;margin:0 0 24px">ORIRI</p>
<p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#B06F76;margin:0">Plan my day</p>
<h1 style="font-weight:300;font-size:32px;color:#4E3B40;margin:8px 0">Your spot is saved.</h1>
<p style="font-family:Arial,sans-serif;font-size:14px;color:#8A7378;margin:0 0 20px">Your ${esc(record.feeling)} day · sharpest ${esc(record.sharpest).toLowerCase()} · energy ${esc(record.energy)}/10</p>
${plan.length ? `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif">${rowsHtml}</table>` : ''}
<p style="font-family:Arial,sans-serif;font-size:12px;color:#8A7378;margin-top:28px">Plans are suggestions based on your answers, not medical advice.</p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#8A7378">Oriri · Rising Better Together · <a href="https://oriri.me" style="color:#B06F76">oriri.me</a></p>
</div></div>`;

    await sendMail(email, 'Your Oriri day plan', text, html);
    sendMail(SMTP.notify, `New Plan my day sign-up: ${email}`,
      `${email}\nFeeling: ${record.feeling}\nEnergy: ${record.energy}/10\nSharpest: ${record.sharpest}`,
      `<p>${esc(email)}<br>Feeling: ${esc(record.feeling)}<br>Energy: ${esc(record.energy)}/10<br>Sharpest: ${esc(record.sharpest)}</p>`,
    ).catch((e) => console.log('Plan notify failed:', e?.message));

    return c.json({ success: true, data: { saved: true } });
  } catch (error: any) {
    console.log('Plan signup error:', error?.message);
    return c.json({ success: false, error: 'We saved your details but could not send the email. Please try again shortly.' }, 500);
  }
});

// Admin: list Plan my day sign-ups
app.get('/make-server-a278ea32/plan/signups', async (c) => {
  try {
    const auth = await wellnessAdmin(c);
    if (auth.error) return auth.error;
    const list = ((await kv.getByPrefix('plan:signup:')) || []).filter(Boolean)
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: 'Failed to load sign-ups' }, 500);
  }
});

// ── Nourish: guests save their plan by email (asked at the end, not the start) ──
app.post('/make-server-a278ea32/nourish/save-email', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
      return c.json({ success: false, error: 'Please enter a valid email address.' }, 400);
    }
    if (body.consent !== true) return c.json({ success: false, error: 'Please tick the consent box.' }, 400);

    const key = `nourish:lead:${email}`;
    const prev: any = await kv.get(key);

    // Premium waitlist: just flag the lead, no recipe email
    if (body.premiumInterest === true) {
      await kv.set(key, {
        source: 'nourish',
        goal: String(body.goal ?? '').slice(0, 40),
        goalLabel: String(body.goalLabel ?? '').slice(0, 40),
        createdAt: new Date().toISOString(),
        ...prev,
        email,
        consent: true,
        premiumInterest: true,
        premiumAt: new Date().toISOString(),
      });
      return c.json({ success: true, data: { saved: true } });
    }

    if (prev?.lastSentAt && Date.now() - new Date(prev.lastSentAt).getTime() < 10 * 60 * 1000) {
      return c.json({ success: true, data: { duplicate: true } });
    }

    const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n);
    const goalLabel = clip(body.goalLabel, 40);
    const meal = body.tomorrow || {};
    const tomorrow = {
      name: clip(meal.name, 80),
      time: clip(meal.time, 30),
      ingredients: (Array.isArray(meal.ingredients) ? meal.ingredients : []).slice(0, 20).map((x: unknown) => clip(x, 120)),
      steps: (Array.isArray(meal.steps) ? meal.steps : []).slice(0, 12).map((x: unknown) => clip(x, 300)),
    };
    const record = {
      email,
      goal: clip(body.goal, 40),
      goalLabel,
      source: 'nourish',
      consent: true,
      premiumInterest: !!prev?.premiumInterest,
      createdAt: prev?.createdAt || new Date().toISOString(),
      lastSentAt: new Date().toISOString(),
    };
    await kv.set(key, record);

    const text = `Your Nourish plan is saved.\n\nGoal: ${goalLabel}\n\nTomorrow's recipe: ${tomorrow.name}${tomorrow.time ? ` (${tomorrow.time})` : ''}\n\nIngredients:\n${tomorrow.ingredients.map((i: string) => `- ${i}`).join('\n')}\n\nMethod:\n${tomorrow.steps.map((st: string, i: number) => `${i + 1}. ${st}`).join('\n')}\n\nOpen your plan any time: https://oriri.me/nourish\n\nNot medical advice. Always consult a healthcare professional.\nOriri · Rising Better Together`;
    const html = `<div style="background:#FBF6F4;padding:32px 16px;font-family:Georgia,serif"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:24px;padding:32px;border:1px solid #EFE3DF">
<p style="letter-spacing:.28em;font-size:20px;color:#4E3B40;margin:0 0 24px">ORIRI</p>
<p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#B06F76;margin:0">Nourish · ${esc(goalLabel)}</p>
<h1 style="font-weight:300;font-size:30px;color:#4E3B40;margin:8px 0 4px">Tomorrow's recipe</h1>
<p style="font-size:22px;color:#4E3B40;margin:0 0 4px">${esc(tomorrow.name)}</p>
<p style="font-family:Arial,sans-serif;font-size:13px;color:#8A7378;margin:0 0 20px">${esc(tomorrow.time)}</p>
<p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#B06F76;margin:0 0 6px">Ingredients</p>
<ul style="font-family:Arial,sans-serif;font-size:14px;color:#4E3B40;padding-left:18px;margin:0 0 18px">${tomorrow.ingredients.map((i: string) => `<li style="margin:3px 0">${esc(i)}</li>`).join('')}</ul>
<p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#B06F76;margin:0 0 6px">Method</p>
<ol style="font-family:Arial,sans-serif;font-size:14px;color:#4E3B40;padding-left:18px;margin:0 0 24px">${tomorrow.steps.map((st: string) => `<li style="margin:5px 0">${esc(st)}</li>`).join('')}</ol>
<a href="https://oriri.me/nourish" style="display:inline-block;background:#B06F76;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;padding:12px 22px;border-radius:999px">Open my plan</a>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#8A7378;margin-top:28px">Not medical advice. Always consult a healthcare professional.</p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#8A7378">Oriri · Rising Better Together · <a href="https://oriri.me" style="color:#B06F76">oriri.me</a></p>
</div></div>`;

    await sendMail(email, `Your Nourish plan + tomorrow's recipe`, text, html);
    sendMail(SMTP.notify, `New Nourish sign-up: ${email}`, `${email}\nGoal: ${goalLabel}`, `<p>${esc(email)}<br>Goal: ${esc(goalLabel)}</p>`)
      .catch((e) => console.log('Nourish notify failed:', e?.message));

    return c.json({ success: true, data: { saved: true } });
  } catch (error: any) {
    console.log('Nourish save-email error:', error?.message);
    return c.json({ success: false, error: 'We could not send the email just now. Please try again shortly.' }, 500);
  }
});

// Admin: list Nourish email sign-ups
app.get('/make-server-a278ea32/nourish/leads', async (c) => {
  try {
    const auth = await wellnessAdmin(c);
    if (auth.error) return auth.error;
    const list = ((await kv.getByPrefix('nourish:lead:')) || []).filter(Boolean)
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: 'Failed to load sign-ups' }, 500);
  }
});

// ── Wellness Bestie: founding pilot applications (/pilot) ──
// Stored in KV (Admin → Sign-ups) and forwarded to a Google Sheet via an
// Apps Script web app URL saved as the secret PILOT_SHEET_WEBHOOK_URL.
const PILOT_COLUMNS = [
  'submitted_at', 'first_name', 'home_area', 'age_group', 'workouts', 'whatsapp', 'heard_from', 'consent',
  'wb_source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'landing_page', 'referrer', 'first_touch_source', 'first_touch_medium', 'first_touch_campaign', 'page_url',
];

app.post('/make-server-a278ea32/pilot/apply', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const clip = (v: unknown, n = 120) => String(v ?? '').trim().slice(0, n);
    const first_name = clip(body.first_name, 60);
    const whatsapp = clip(body.whatsapp, 30).replace(/[^\d+\s-]/g, '');
    if (!first_name) return c.json({ success: false, error: 'Please add your first name.' }, 400);
    if (whatsapp.replace(/\D/g, '').length < 8) return c.json({ success: false, error: 'Please check your WhatsApp number.' }, 400);
    if (body.consent !== true) return c.json({ success: false, error: 'Please tick the consent box.' }, 400);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: Record<string, string> = {
      id,
      submitted_at: clip(body.submitted_at, 40) || new Date().toISOString(),
      received_at: new Date().toISOString(),
      first_name,
      home_area: clip(body.home_area, 60),
      age_group: clip(body.age_group, 10),
      workouts: (Array.isArray(body.workouts) ? body.workouts : []).slice(0, 20).map((w: unknown) => clip(w, 30)).join(', '),
      whatsapp,
      heard_from: clip(body.heard_from, 20),
      consent: 'yes',
      wb_source: clip(body.wb_source, 30) || 'direct',
      utm_source: clip(body.utm_source, 100),
      utm_medium: clip(body.utm_medium, 100),
      utm_campaign: clip(body.utm_campaign, 100),
      utm_content: clip(body.utm_content, 100),
      utm_term: clip(body.utm_term, 100),
      landing_page: clip(body.landing_page, 300),
      referrer: clip(body.referrer, 300),
      first_touch_source: clip(body.first_touch_source, 100),
      first_touch_medium: clip(body.first_touch_medium, 100),
      first_touch_campaign: clip(body.first_touch_campaign, 100),
      page_url: clip(body.page_url, 400),
    };
    await kv.set(`pilot:application:${id}`, record);

    // Google Sheet (Apps Script web app). Never blocks the applicant.
    const sheetUrl = Deno.env.get('PILOT_SHEET_WEBHOOK_URL');
    if (sheetUrl) {
      fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: PILOT_COLUMNS, row: PILOT_COLUMNS.map((k) => record[k] ?? '') , record }),
      }).catch((e) => console.log('Pilot sheet forward failed:', e?.message));
    }

    sendMail(
      SMTP.notify,
      `New pilot application: ${first_name} (${record.wb_source})`,
      PILOT_COLUMNS.map((k) => `${k}: ${record[k] ?? ''}`).join('\n'),
      `<table style="font-family:Arial,sans-serif;font-size:14px">${PILOT_COLUMNS.map((k) => `<tr><td style="color:#75695D;padding:3px 12px 3px 0">${k}</td><td>${esc(record[k])}</td></tr>`).join('')}</table>`,
    ).catch((e) => console.log('Pilot notify failed:', e?.message));

    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    console.log('Pilot apply error:', error?.message);
    return c.json({ success: false, error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Admin: list pilot applications
app.get('/make-server-a278ea32/pilot/applications', async (c) => {
  try {
    const auth = await wellnessAdmin(c);
    if (auth.error) return auth.error;
    const list = ((await kv.getByPrefix('pilot:application:')) || []).filter(Boolean)
      .sort((a: any, b: any) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: 'Failed to load applications' }, 500);
  }
});

Deno.serve(app.fetch);
