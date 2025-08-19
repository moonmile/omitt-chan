'use client';

import { useState, useEffect } from 'react';

interface RequirementItem {
  id: string;
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  type?: string;
}

interface SystemComponent {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'security' | 'integration';
  description: string;
  technologies: string[];
  justification: string;
}

interface SystemArchitecture {
  architecture_type: 'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded';
  deployment_environment: 'cloud' | 'on_premise' | 'hybrid';
  components: SystemComponent[];
  network_requirements: string[];
  security_measures: string[];
  scalability_considerations: string[];
}

interface StructuredRequirements {
  functional_requirements: RequirementItem[];
  non_functional_requirements: RequirementItem[];
  constraints: RequirementItem[];
  wishes: RequirementItem[];
  design_guidelines: RequirementItem[];
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export default function Home() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'こんにちは！見積もり依頼書の作成をお手伝いします。どのようなシステムや機能をご希望ですか？',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [systemArchitecture, setSystemArchitecture] = useState<SystemArchitecture | null>(null);
  const [isGeneratingArchitecture, setIsGeneratingArchitecture] = useState(false);
  const [selectedArchitectureType, setSelectedArchitectureType] = useState<'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded'>('web');
  const [activeTab, setActiveTab] = useState<'chat' | 'requirements' | 'estimate'>('chat');
  const [requirements, setRequirements] = useState<StructuredRequirements>({
    functional_requirements: [],
    non_functional_requirements: [],
    constraints: [],
    wishes: [],
    design_guidelines: []
  });

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isAnalyzing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsAnalyzing(true);

    try {
      // OpenAI APIで要件分析
      const response = await fetch('/api/analyze-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          context: requirements
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 抽出された要件を既存の要件に統合
        const newRequirements = {
          functional_requirements: [...requirements.functional_requirements, ...result.requirements.functional_requirements],
          non_functional_requirements: [...requirements.non_functional_requirements, ...result.requirements.non_functional_requirements],
          constraints: [...requirements.constraints, ...result.requirements.constraints],
          wishes: [...requirements.wishes, ...result.requirements.wishes],
          design_guidelines: [...requirements.design_guidelines, ...result.requirements.design_guidelines]
        };
        setRequirements(newRequirements);

        // 要件が更新された場合、システム構成を自動再生成
        if (getAllRequirements().length > 0) {
          generateSystemArchitecture(newRequirements);
        }

        // アシスタントの返答
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: result.assistantResponse,
          sender: 'assistant',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        // エラー時の返答
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: result.assistantResponse || 'エラーが発生しました。もう一度お試しください。',
          sender: 'assistant',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: '通信エラーが発生しました。もう一度お試しください。',
        sender: 'assistant',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateSystemArchitecture = async (reqData?: StructuredRequirements) => {
    const reqToUse = reqData || requirements;
    
    if (getAllRequirements().length === 0) return;

    setIsGeneratingArchitecture(true);
    try {
      const response = await fetch('/api/generate-architecture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: reqToUse,
          preferredArchitectureType: selectedArchitectureType
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSystemArchitecture(result.architecture);
      } else {
        console.error('Failed to generate architecture:', result.error);
      }
    } catch (error) {
      console.error('Error generating architecture:', error);
    } finally {
      setIsGeneratingArchitecture(false);
    }
  };

  const validateRequirements = async () => {
    if (getAllRequirements().length === 0) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: '検証する要件がありません。まず要件を抽出してください。',
        sender: 'assistant',
        timestamp: new Date()
      }]);
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/validate-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirements }),
      });

      const data = await response.json();
      
      if (data.success) {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: data.chatMessage,
          sender: 'assistant',
          timestamp: new Date()
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: data.chatMessage || '要件の検証に失敗しました。',
          sender: 'assistant',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error validating requirements:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: '要件検証中にエラーが発生しました。もう一度お試しください。',
        sender: 'assistant',
        timestamp: new Date()
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAllRequirements = () => {
    if (window.confirm('すべての要件を削除しますか？この操作は元に戻せません。')) {
      setRequirements({
        functional_requirements: [],
        non_functional_requirements: [],
        constraints: [],
        wishes: [],
        design_guidelines: []
      });
      setSystemArchitecture(null);
    }
  };

  const removeRequirement = (category: keyof StructuredRequirements, id: string) => {
    const newRequirements = {
      ...requirements,
      [category]: requirements[category].filter(req => req.id !== id)
    };
    setRequirements(newRequirements);
    
    // 要件が削除された場合、システム構成を自動更新
    if (getAllRequirements().length > 1) { // 削除後も要件が残っている場合のみ
      generateSystemArchitecture(newRequirements);
    } else {
      // 要件がすべて削除された場合、システム構成もクリア
      setSystemArchitecture(null);
    }
  };

  const getAllRequirements = (): RequirementItem[] => {
    return [
      ...requirements.functional_requirements.map(req => ({ ...req, type: '機能要件' })),
      ...requirements.non_functional_requirements.map(req => ({ ...req, type: '非機能要件' })),
      ...requirements.constraints.map(req => ({ ...req, type: '制約条件' })),
      ...requirements.wishes.map(req => ({ ...req, type: '希望・要望' })),
      ...requirements.design_guidelines.map(req => ({ ...req, type: '設計指針' })),
    ];
  };

  const getArchitectureTypeText = (type: string) => {
    switch (type) {
      case 'web': return 'Webシステム';
      case 'cloud': return 'クラウドシステム';
      case 'hybrid': return 'ハイブリッドシステム';
      case 'on_premise': return 'オンプレミスシステム';
      default: return type;
    }
  };

  const getDeploymentText = (env: string) => {
    switch (env) {
      case 'cloud': return 'クラウド環境';
      case 'on_premise': return 'オンプレミス環境';
      case 'hybrid': return 'ハイブリッド環境';
      default: return env;
    }
  };

  const getComponentTypeText = (type: string) => {
    switch (type) {
      case 'frontend': return 'フロントエンド';
      case 'backend': return 'バックエンド';
      case 'database': return 'データベース';
      case 'infrastructure': return 'インフラストラクチャ';
      case 'security': return 'セキュリティ';
      case 'integration': return 'インテグレーション';
      default: return type;
    }
  };

  const estimateTemplate = `
見積もり依頼書

【案件名】
システム開発業務

【発注者】
株式会社○○○

【概要】
以下の機能を含むWebアプリケーションの開発

【機能要件】
${requirements.functional_requirements.map(req => `・${req.title}: ${req.description}`).join('\n')}

【非機能要件】
${requirements.non_functional_requirements.map(req => `・${req.title}: ${req.description}`).join('\n')}

【制約条件】
${requirements.constraints.map(req => `・${req.title}: ${req.description}`).join('\n')}

【希望事項】
${requirements.wishes.map(req => `・${req.title}: ${req.description}`).join('\n')}

${systemArchitecture ? `【システム構成】
システム種別: ${getArchitectureTypeText(systemArchitecture.architecture_type)}
デプロイメント環境: ${getDeploymentText(systemArchitecture.deployment_environment)}

■システムコンポーネント
${systemArchitecture.components.map(comp => 
  `・${comp.name} (${getComponentTypeText(comp.type)})
  説明: ${comp.description}
  技術: ${comp.technologies.join(', ')}
  選択理由: ${comp.justification}`
).join('\n\n')}

■ネットワーク要件
${systemArchitecture.network_requirements.map(req => `・${req}`).join('\n')}

■セキュリティ対策
${systemArchitecture.security_measures.map(measure => `・${measure}`).join('\n')}

■スケーラビリティ考慮事項
${systemArchitecture.scalability_considerations.map(consideration => `・${consideration}`).join('\n')}
` : '【システム構成】\n要件が不足しているため、システム構成を生成できませんでした。'}

【納期】
契約締結後○ヶ月

【予算】
○○万円～○○万円

【提案期限】
令和○年○月○日

【連絡先】
担当者：○○○
TEL：000-0000-0000
Email：example@company.com
  `;

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority?: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '-';
    }
  };

  // Markdown風の簡単なフォーマット処理
  const MessageContent = ({ content }: { content: string }) => {
    const formatContent = (text: string) => {
      // **太字**を処理
      let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // 改行を<br>に変換
      formatted = formatted.replace(/\n/g, '<br>');
      
      return formatted;
    };

    return (
      <div 
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">omitt-chan</h1>
        <p className="text-xs md:text-sm text-gray-600">見積もり依頼作成ツール</p>
      </header>

      {/* モバイル用タブナビゲーション */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
              activeTab === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💬 チャット
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
              activeTab === 'requirements'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 要件 ({getAllRequirements().length})
          </button>
          <button
            onClick={() => setActiveTab('estimate')}
            className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
              activeTab === 'estimate'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 見積もり
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* デスクトップ版：3ペイン構成 */}
        <div className="hidden md:flex flex-1">
          {/* 左ペイン：チャットフォーム */}
          <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">要件入力チャット</h2>
              <p className="text-sm text-gray-600">対話的に要件を入力してください</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map(message => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.sender === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    <MessageContent content={message.content} />
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('ja-JP', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="space-y-2">
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isAnalyzing) {
                      handleSendMessage();
                    }
                  }}
                  placeholder="要件を入力してください (Ctrl+Enterで送信)"
                  className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  disabled={isAnalyzing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isAnalyzing}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      分析中
                    </>
                  ) : (
                    '送信'
                  )}
                </button>
              </div>
            </div>
          </div>
                  message.sender === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-900'
                }`}>
                  <MessageContent content={message.content} />
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString('ja-JP', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="space-y-2">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isAnalyzing) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="要件や機能を入力してください...&#10;&#10;例:&#10;- メールを配布するツールを作りたい&#10;- 宛先はあらかじめExcelに登録しておく&#10;- 指定した時刻に配布できるようにする&#10;- 配布先はログに残しておく"
                disabled={isAnalyzing}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Ctrl+Enter または Cmd+Enter で送信
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={isAnalyzing || !currentMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      分析中
                    </>
                  ) : (
                    '送信'
                  )}
                </button>
              </div>
            </div>
            {isAnalyzing && (
              <div className="mt-2 text-xs text-gray-600">
                AIが要件を分析しています...
              </div>
            )}
          </div>
        </div>

        {/* 中央ペイン：構造化された要件表示 */}
        <div className="w-1/3 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">構造化要件</h2>
              <p className="text-sm text-gray-600">
                入力された要件を整理表示 ({getAllRequirements().length}件)
              </p>
            </div>
            <div className="flex gap-2">
              {getAllRequirements().length > 0 && (
                <>
                  <button
                    onClick={validateRequirements}
                    disabled={isAnalyzing}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 focus:outline-none disabled:opacity-50"
                    title="要件の検証（不足・矛盾チェック）"
                  >
                    {isAnalyzing ? '検証中...' : '検証'}
                  </button>
                  <button
                    onClick={clearAllRequirements}
                    className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 focus:outline-none"
                    title="すべての要件を削除"
                  >
                    全削除
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            {/* 機能要件 */}
            {requirements.functional_requirements.length > 0 && (
              <div>
                <h3 className="font-medium text-blue-800 mb-2">機能要件</h3>
                {requirements.functional_requirements.map(req => (
                  <div key={req.id} className="border border-blue-200 rounded-lg p-3 mb-2 bg-blue-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-2 flex-1">
                        <button
                          onClick={() => removeRequirement('functional_requirements', req.id)}
                          className="mt-1 text-red-500 hover:text-red-700 focus:outline-none"
                          title="この要件を削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-blue-700">{req.title}</span>
                        </div>
                      </div>
                      {req.priority && (
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(req.priority)}`}>
                          {getPriorityText(req.priority)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-blue-900 ml-6">{req.description}</p>
                    {req.category && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-2 ml-6 inline-block">
                        {req.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 非機能要件 */}
            {requirements.non_functional_requirements.length > 0 && (
              <div>
                <h3 className="font-medium text-green-800 mb-2">非機能要件</h3>
                {requirements.non_functional_requirements.map(req => (
                  <div key={req.id} className="border border-green-200 rounded-lg p-3 mb-2 bg-green-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-2 flex-1">
                        <button
                          onClick={() => removeRequirement('non_functional_requirements', req.id)}
                          className="mt-1 text-red-500 hover:text-red-700 focus:outline-none"
                          title="この要件を削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-green-700">{req.title}</span>
                        </div>
                      </div>
                      {req.priority && (
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(req.priority)}`}>
                          {getPriorityText(req.priority)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-900 ml-6">{req.description}</p>
                    {req.category && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded mt-2 ml-6 inline-block">
                        {req.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 制約条件 */}
            {requirements.constraints.length > 0 && (
              <div>
                <h3 className="font-medium text-red-800 mb-2">制約条件</h3>
                {requirements.constraints.map(req => (
                  <div key={req.id} className="border border-red-200 rounded-lg p-3 mb-2 bg-red-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-2 flex-1">
                        <button
                          onClick={() => removeRequirement('constraints', req.id)}
                          className="mt-1 text-red-500 hover:text-red-700 focus:outline-none"
                          title="この要件を削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-red-700">{req.title}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-red-900 ml-6">{req.description}</p>
                    {req.type && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-2 ml-6 inline-block">
                        {req.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 希望・要望 */}
            {requirements.wishes.length > 0 && (
              <div>
                <h3 className="font-medium text-purple-800 mb-2">希望・要望</h3>
                {requirements.wishes.map(req => (
                  <div key={req.id} className="border border-purple-200 rounded-lg p-3 mb-2 bg-purple-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-2 flex-1">
                        <button
                          onClick={() => removeRequirement('wishes', req.id)}
                          className="mt-1 text-red-500 hover:text-red-700 focus:outline-none"
                          title="この要件を削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-purple-700">{req.title}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-purple-900 ml-6">{req.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 設計指針 */}
            {requirements.design_guidelines.length > 0 && (
              <div>
                <h3 className="font-medium text-indigo-800 mb-2">設計指針</h3>
                {requirements.design_guidelines.map(req => (
                  <div key={req.id} className="border border-indigo-200 rounded-lg p-3 mb-2 bg-indigo-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-2 flex-1">
                        <button
                          onClick={() => removeRequirement('design_guidelines', req.id)}
                          className="mt-1 text-red-500 hover:text-red-700 focus:outline-none"
                          title="この要件を削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-indigo-700">{req.title}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-indigo-900 ml-6">{req.description}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* システム構成 */}
            {systemArchitecture && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-800 mb-3">システム構成</h3>
                
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-700 mb-2">
                      <strong>システム種別:</strong> {getArchitectureTypeText(systemArchitecture.architecture_type)}
                    </div>
                    <div className="text-sm text-gray-700">
                      <strong>デプロイメント:</strong> {getDeploymentText(systemArchitecture.deployment_environment)}
                    </div>
                  </div>

                  {/* システムコンポーネント */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">システムコンポーネント</h4>
                    <div className="space-y-2">
                      {systemArchitecture.components.map(comp => (
                        <div key={comp.id} className="border border-gray-200 rounded p-2 text-xs">
                          <div className="font-medium text-gray-800">{comp.name}</div>
                          <div className="text-gray-600 mb-1">{getComponentTypeText(comp.type)}</div>
                          <div className="text-gray-600 mb-1">{comp.description}</div>
                          <div className="text-blue-600">技術: {comp.technologies.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ネットワーク要件 */}
                  {systemArchitecture.network_requirements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">ネットワーク要件</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {systemArchitecture.network_requirements.map((req, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-1 h-1 rounded-full bg-gray-400 mt-2 mr-2 flex-shrink-0"></span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* セキュリティ対策 */}
                  {systemArchitecture.security_measures.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">セキュリティ対策</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {systemArchitecture.security_measures.map((measure, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-1 h-1 rounded-full bg-red-400 mt-2 mr-2 flex-shrink-0"></span>
                            {measure}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {getAllRequirements().length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>まだ要件が入力されていません</p>
                <p className="text-sm">左のチャットで要件を入力してください</p>
              </div>
            )}
          </div>
        </div>

        {/* 右ペイン：見積もり依頼書テンプレート */}
        <div className="w-1/3 bg-white">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">見積もり依頼書</h2>
            <p className="text-sm text-gray-600">自動生成されたテンプレート</p>
          </div>
          
          <div className="p-4 overflow-y-auto h-full">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                {estimateTemplate}
              </pre>
            </div>
            
            <div className="mt-4 space-y-2">
              {/* アーキテクチャタイプ選択 */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  アーキテクチャタイプ
                </label>
                <select
                  value={selectedArchitectureType}
                  onChange={(e) => setSelectedArchitectureType(e.target.value as 'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="web">Webアプリケーション</option>
                  <option value="cloud">クラウドネイティブ</option>
                  <option value="hybrid">ハイブリッド</option>
                  <option value="on_premise">オンプレミス</option>
                  <option value="embedded">組み込みシステム</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedArchitectureType === 'web' && 'ブラウザベースのWebアプリケーション'}
                  {selectedArchitectureType === 'cloud' && 'クラウドサービスを活用したスケーラブルなシステム'}
                  {selectedArchitectureType === 'hybrid' && 'クラウドとオンプレミスを組み合わせた構成'}
                  {selectedArchitectureType === 'on_premise' && '自社サーバーでの運用を前提とした構成'}
                  {selectedArchitectureType === 'embedded' && 'ハードウェアに組み込まれたリアルタイムシステム'}
                </p>
              </div>
              
              <button 
                onClick={() => generateSystemArchitecture()}
                disabled={isGeneratingArchitecture || getAllRequirements().length === 0}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isGeneratingArchitecture ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    システム構成生成中
                  </>
                ) : (
                  'システム構成を生成'
                )}
              </button>
              <button className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
                PDFでダウンロード
              </button>
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                メールで送信
              </button>
              <button className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm">
                3パターン見積もり作成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
