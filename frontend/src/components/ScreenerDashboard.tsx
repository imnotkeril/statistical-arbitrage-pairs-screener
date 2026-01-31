import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { api } from '../services/api';
import PairsTable from './PairsTable';
import StatisticsPanel from './StatisticsPanel';
import CorrelationHeatmap from './CorrelationHeatmap';
import ScreenerSettings from './ScreenerSettings';
import AlertManager from './AlertManager';
import TrendsDashboard from './TrendsDashboard';

const ScreenerDashboard: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isStarting, setIsStarting] = useState(false);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Auto-start screening if no data available after component mounts
    const autoStartTimer = setTimeout(async () => {
      try {
        const statusData = queryClient.getQueryData('screening-status') as any;
        const resultsData = queryClient.getQueryData('screening-results') as any;
        const hasData = resultsData?.results?.length > 0 || false;
        const isRunning = statusData?.is_running || false;
        
        // If no data and not running, start screening automatically
        if (!hasData && !isRunning) {
          await api.runLiveScreening();
          queryClient.invalidateQueries('screening-status');
          queryClient.invalidateQueries('screening-results');
        }
      } catch (error) {
        console.error('Error auto-starting screening:', error);
      }
    }, 2000); // Wait 2 seconds after mount to check status
    
    return () => clearTimeout(autoStartTimer);
  }, [queryClient]);

  // Get status with live updates
  const { data: status, error: statusError } = useQuery(
    'screening-status',
    api.getStatus,
    { 
      refetchInterval: 10000, // Poll every 10 seconds (reduced from 2s)
      refetchOnWindowFocus: false, // Disable refetch on window focus to reduce load
      staleTime: 5000, // Consider data fresh for 5 seconds
      retry: 1,
    }
  );

  // Get results with live updates
  const { data: results, isLoading: resultsLoading } = useQuery(
    'screening-results',
    () => api.getResults(100),
    { 
      refetchInterval: () => {
        // Only refetch if screening is running or we have no data
        try {
          const statusData = queryClient.getQueryData('screening-status') as any;
          const isRunning = statusData?.is_running || false;
          
          // Get current results data safely
          const resultsData = queryClient.getQueryData('screening-results') as any;
          const hasData = resultsData?.results?.length > 0 || false;
          
          // If screening is running, check every 10 seconds
          // If not running but we have data, check every 30 seconds
          // If no data, check every 15 seconds
          if (isRunning) return 10000;
          if (hasData) return 30000;
          return 15000;
        } catch (error) {
          // Fallback to default interval if there's any error
          console.warn('Error in refetchInterval:', error);
          return 15000;
        }
      },
      enabled: true,
      retry: 1,
      retryDelay: 2000,
      staleTime: 8000, // Consider data fresh for 8 seconds
      onSuccess: () => {
        setLastUpdate(new Date());
      },
    }
  );

  // Get statistics with live updates
  const { data: stats } = useQuery(
    'statistics', 
    api.getStatistics,
    { 
      refetchInterval: 15000, // Update every 15 seconds (reduced from 3s)
      staleTime: 10000, // Consider data fresh for 10 seconds
    }
  );

  // Update last update time display
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const handleRunScreening = async () => {
    setIsStarting(true);
    try {
      await api.runLiveScreening();
      // Invalidate queries to refresh data
      queryClient.invalidateQueries('screening-status');
      queryClient.invalidateQueries('screening-results');
      queryClient.invalidateQueries('statistics');
      // Reset button state after 2 seconds
      setTimeout(() => setIsStarting(false), 2000);
    } catch (error) {
      console.error('Error starting screening:', error);
      setIsStarting(false);
      alert('Failed to start screening. Please check console for details.');
    }
  };

  // Fallback styles to ensure visibility even if Tailwind fails
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0a0a0f',
    color: '#e5e5e5',
    padding: '0',
    margin: '0',
  };
  
  const contentStyle: React.CSSProperties = {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    color: '#e5e5e5',
  };
  
  const headerStyle: React.CSSProperties = {
    marginBottom: '2rem',
  };
  
  const titleStyle: React.CSSProperties = {
    fontSize: '2.25rem',
    fontWeight: 300,
    color: '#ffffff',
    margin: 0,
    padding: 0,
  };
  
  const subtitleStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  };
  
  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Header - Always visible with inline styles */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div>
              <h1 style={titleStyle}>
                Live Pairs Screener
              </h1>
              <p style={subtitleStyle}>
                Statistical Arbitrage • Real-time Analysis
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={handleRunScreening}
                disabled={isStarting || status?.is_running}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: isStarting || status?.is_running ? '#6b7280' : '#10b981',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: isStarting || status?.is_running ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s',
                  opacity: isStarting || status?.is_running ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isStarting && !status?.is_running) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isStarting && !status?.is_running) {
                    e.currentTarget.style.backgroundColor = '#10b981';
                  }
                }}
              >
                {isStarting ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}></div>
                    Starting...
                  </>
                ) : status?.is_running ? (
                  <>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}></div>
                    Running...
                  </>
                ) : (
                  <>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run Screening
                  </>
                )}
              </button>
              <AlertManager />
              <ScreenerSettings 
                onSettingsApplied={() => {
                  // Invalidate queries to refresh data
                  queryClient.invalidateQueries('screening-results');
                  queryClient.invalidateQueries('screening-status');
                  queryClient.invalidateQueries('statistics');
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#34d399', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Live</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Updated: {formatTime(lastUpdate)}
              </div>
            </div>
          </div>
        </div>

        {/* Error message if API is not available */}
        {statusError && (
          <div style={{ 
            marginBottom: '1.5rem', 
            backgroundColor: 'rgba(251, 191, 36, 0.1)', 
            border: '1px solid rgba(251, 191, 36, 0.5)', 
            borderRadius: '0.75rem', 
            padding: '1rem' 
          }}>
            <p style={{ color: '#fbbf24', margin: 0 }}>
              ⚠️ Cannot connect to backend API. Please ensure the backend server is running on http://localhost:8000
            </p>
          </div>
        )}

        {/* Statistics Panel */}
        {stats && <StatisticsPanel stats={stats} />}

        {/* Results Table */}
        <div style={{ marginTop: '1.5rem' }}>
          {resultsLoading ? (
            <div style={{
              backgroundColor: '#111118',
              border: '1px solid #1a1a24',
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center',
            }}>
              <div style={{
                display: 'inline-block',
                width: '2rem',
                height: '2rem',
                border: '2px solid #10b981',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}></div>
              <p style={{ color: '#9ca3af', marginTop: '1rem' }}>Scanning pairs...</p>
            </div>
          ) : results && results.results.length > 0 ? (
            <PairsTable pairs={results.results} />
          ) : (
            <div style={{
              backgroundColor: '#111118',
              border: '1px solid #1a1a24',
              borderRadius: '0.75rem',
              padding: '3rem',
              textAlign: 'center',
            }}>
              <div style={{
                display: 'inline-block',
                width: '2rem',
                height: '2rem',
                border: '2px solid #10b981',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '1rem',
              }}></div>
              <p style={{ color: '#9ca3af' }}>Initializing screener...</p>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                First scan may take a few minutes
              </p>
            </div>
          )}
        </div>

        {/* Trends Dashboard */}
        <div style={{ marginTop: '1.5rem' }}>
          <TrendsDashboard />
        </div>

        {/* Correlation Heatmap - Below table */}
        <div style={{ marginTop: '1.5rem' }}>
          {results && results.results.length > 0 ? (
            <CorrelationHeatmap pairs={results.results} />
          ) : (
            <div className="bg-[#111118] border border-[#1a1a24] rounded-xl p-6 text-center">
              <div className="inline-block animate-pulse w-4 h-4 bg-emerald-500/30 rounded-full mb-3"></div>
              <p className="text-xs text-gray-500">Waiting for data...</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Auto-screening runs continuously • Updates every 10-30 seconds • Last scan: {
              status?.last_session?.completed_at 
                ? new Date(status.last_session.completed_at).toLocaleTimeString()
                : 'Never'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScreenerDashboard;
