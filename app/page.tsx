'use client';

import { useState } from 'react';

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
  architecture_type: 'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded' | 'mobile_app' | 'game' | 'other';
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

interface ValidationResult {
  overall_status: 'good' | 'warning' | 'critical';
  missing_requirements: string[];
  contradictions: string[];
  unclear_requirements: string[];
  recommendations: string[];
  completeness_score: number;
  critical_questions: {
    system_type_missing: boolean;
    personal_data_missing: boolean;
    user_scope_missing: boolean;
  };
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
  const [selectedArchitectureType, setSelectedArchitectureType] = useState<'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded' | 'mobile_app' | 'game' | 'other'>('web');
  const [activeTab, setActiveTab] = useState<'chat' | 'requirements' | 'estimate'>('chat');
  const [showHelp, setShowHelp] = useState(false);
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

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.assistantResponse || 'APIからの応答が空でした。',
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, assistantMessage]);
        
        if (data.requirements) {
          // 既存要件数をチェック（デバッグ用）
          const currentTotal = getAllRequirements().length;
          
          // 一時的に新しい要件を設定して数を計算
          const tempRequirements = data.requirements as StructuredRequirements;
          const newTotal = (
            tempRequirements.functional_requirements.length +
            tempRequirements.non_functional_requirements.length +
            tempRequirements.constraints.length +
            tempRequirements.wishes.length +
            tempRequirements.design_guidelines.length
          );
          
          // 要件数が大幅に減少した場合は警告
          if (currentTotal > 0 && newTotal < currentTotal * 0.5) {
            console.warn(`要件数が大幅に減少しました: ${currentTotal} → ${newTotal}`);
            setChatMessages(prev => [...prev, {
              id: Date.now().toString(),
              content: '⚠️ 注意: 既存の要件の一部が失われた可能性があります。必要に応じて確認してください。',
              sender: 'assistant',
              timestamp: new Date()
            }]);
          }
          
          setRequirements(data.requirements);
          // 要件が更新された場合、自動的にシステム構成も生成
          generateSystemArchitecture(data.requirements);
        }
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.error || 'エラーが発生しました。もう一度お試しください。',
          sender: 'assistant',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'ネットワークエラーが発生しました。',
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
          content: data.chatMessage || '検証結果が空でした。',
          sender: 'assistant',
          timestamp: new Date()
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: data.chatMessage || data.error || '要件の検証に失敗しました。',
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

  const saveRequirementsAsJSON = () => {
    const currentTime = new Date();
    const timestamp = currentTime.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    const exportData = {
      exportInfo: {
        timestamp: currentTime.toISOString(),
        version: "1.0",
        tool: "omitt-chan",
        totalRequirements: getAllRequirements().length
      },
      requirements: requirements,
      systemArchitecture: systemArchitecture
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `requirements-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // チャットにメッセージを追加
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: `📁 構造化要件をJSONファイル「requirements-${timestamp}.json」として保存しました。`,
      sender: 'assistant',
      timestamp: new Date()
    }]);
  };

  const loadRequirementsFromJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // データ構造の検証
          if (data.requirements && typeof data.requirements === 'object') {
            const loadedRequirements = data.requirements;
            
            // 必要なプロパティが存在することを確認
            const requiredProperties = [
              'functional_requirements',
              'non_functional_requirements', 
              'constraints',
              'wishes',
              'design_guidelines'
            ];
            
            const isValidStructure = requiredProperties.every(prop => 
              Array.isArray(loadedRequirements[prop])
            );
            
            if (isValidStructure) {
              setRequirements(loadedRequirements);
              
              // システム構成も読み込む（存在する場合）
              if (data.systemArchitecture) {
                setSystemArchitecture(data.systemArchitecture);
              }
              
              // 一時的に要件を設定してから計算（非同期なので次のレンダリングで計算）
              setTimeout(() => {
                const totalRequirements = getAllRequirements().length;
                setChatMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  content: `📂 JSONファイルから要件を読み込みました。（${totalRequirements}件の要件${data.systemArchitecture ? 'とシステム構成' : ''}を復元）`,
                  sender: 'assistant',
                  timestamp: new Date()
                }]);
              }, 100);
            } else {
              throw new Error('無効な要件データ構造です');
            }
          } else {
            throw new Error('要件データが見つかりません');
          }
        } catch (error) {
          console.error('Error loading JSON:', error);
          setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: `❌ JSONファイルの読み込みに失敗しました。ファイル形式が正しくない可能性があります。`,
            sender: 'assistant',
            timestamp: new Date()
          }]);
        }
      };
      reader.readAsText(file);
    };
    input.click();
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

  const getAllRequirements = () => {
    return [
      ...requirements.functional_requirements,
      ...requirements.non_functional_requirements,
      ...requirements.constraints,
      ...requirements.wishes,
      ...requirements.design_guidelines
    ];
  };

  const generateEstimateTemplate = () => {
    if (!systemArchitecture || getAllRequirements().length === 0) {
      return `見積もり依頼書

【プロジェクト概要】
まず、要件を入力してシステム構成を生成してください。

【システム要件】
要件の分析が完了していません。

【技術仕様】
システム構成の生成をお待ちください。

【その他】
ご質問やご相談がございましたら、お気軽にお声がけください。`;
    }

    const template = `見積もり依頼書

【プロジェクト概要】
${systemArchitecture.architecture_type === 'web' ? 'Webアプリケーション' :
  systemArchitecture.architecture_type === 'cloud' ? 'クラウドネイティブシステム' :
  systemArchitecture.architecture_type === 'hybrid' ? 'ハイブリッドシステム' :
  systemArchitecture.architecture_type === 'embedded' ? '組み込みシステム' :
  systemArchitecture.architecture_type === 'mobile_app' ? 'スマートフォンアプリケーション' :
  systemArchitecture.architecture_type === 'game' ? 'ゲームアプリケーション' :
  systemArchitecture.architecture_type === 'other' ? 'その他のシステム' :
  'オンプレミスシステム'
}の開発をご依頼いたします。

【システム要件】
■ 機能要件 (${requirements.functional_requirements.length}件)
${requirements.functional_requirements.map(req => `・${req.title}: ${req.description}`).join('\n')}

■ 非機能要件 (${requirements.non_functional_requirements.length}件)
${requirements.non_functional_requirements.map(req => `・${req.title}: ${req.description}`).join('\n')}

■ 制約条件 (${requirements.constraints.length}件)
${requirements.constraints.map(req => `・${req.title}: ${req.description}`).join('\n')}

【技術仕様】
■ アーキテクチャタイプ: ${systemArchitecture.architecture_type}
■ デプロイ環境: ${systemArchitecture.deployment_environment}

■ システムコンポーネント (${systemArchitecture.components.length}件)
${systemArchitecture.components.map(comp => 
  `・${comp.name} (${comp.type})\n  技術: ${comp.technologies.join(', ')}\n  概要: ${comp.description}`
).join('\n\n')}

■ ネットワーク要件
${systemArchitecture.network_requirements.map(req => `・${req}`).join('\n')}

■ セキュリティ対策
${systemArchitecture.security_measures.map(measure => `・${measure}`).join('\n')}

■ スケーラビリティ考慮事項
${systemArchitecture.scalability_considerations.map(consideration => `・${consideration}`).join('\n')}

【その他】
ご質問やご相談がございましたら、お気軽にお声がけください。
`;

    return template;
  };

  const estimateTemplate = generateEstimateTemplate();

  // ヘルプページのコンテンツ
  const HelpContent = () => (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">omitt-chan 使用方法</h1>
        <p className="text-gray-600">見積もり依頼書の作成をサポートするAIツールです</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-blue-800 mb-3">🚀 基本的な使い方</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><strong>要件を入力</strong>：チャットで自然な言葉でシステムの要件を説明してください</li>
              <li><strong>要件の確認</strong>：AIが構造化した要件を「構造化要件」ペインで確認</li>
              <li><strong>アーキテクチャ選択</strong>：適切なシステムタイプを選択</li>
              <li><strong>構成生成</strong>：「システム構成を生成」ボタンで技術仕様を自動生成</li>
              <li><strong>見積もり書作成</strong>：自動生成された見積もり依頼書を確認・利用</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-800 mb-3">💬 チャット機能</h2>
          <div className="bg-green-50 p-4 rounded-lg space-y-2 text-sm">
            <p><strong>要件入力のコツ：</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>「ユーザー管理機能が必要です」「データベースはMySQL希望」など具体的に</li>
              <li>「月間1万人のユーザーを想定」など規模感も記載</li>
              <li>「セキュリティは重要」「レスポンス速度を重視」など非機能要件も</li>
              <li>「予算は〇〇万円程度」「開発期間は3ヶ月」など制約条件も重要</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-800 mb-3">🏗️ アーキテクチャタイプ</h2>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><strong>Webアプリケーション</strong>：ブラウザベースのシステム</div>
              <div><strong>スマホアプリ</strong>：iOS/Android向けアプリ</div>
              <div><strong>ゲーム</strong>：ゲーム開発向け構成</div>
              <div><strong>クラウドネイティブ</strong>：クラウド活用型</div>
              <div><strong>ハイブリッド</strong>：クラウド＋オンプレミス</div>
              <div><strong>オンプレミス</strong>：自社サーバー運用</div>
              <div><strong>組み込みシステム</strong>：ハードウェア組み込み</div>
              <div><strong>その他</strong>：特殊なシステム構成</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-orange-800 mb-3">🔧 便利機能</h2>
          <div className="bg-orange-50 p-4 rounded-lg space-y-3 text-sm">
            <div>
              <strong>📁 保存・読み込み</strong>
              <p className="ml-4">要件をJSONファイルで保存し、後で読み込んで作業を継続できます</p>
            </div>
            <div>
              <strong>✅ 要件検証</strong>
              <p className="ml-4">「検証」ボタンで要件の不足や矛盾をチェックできます</p>
            </div>
            <div>
              <strong>📱 モバイル対応</strong>
              <p className="ml-4">スマートフォンでもタブ切り替えで快適に利用可能</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-red-800 mb-3">⚠️ 注意事項</h2>
          <div className="bg-red-50 p-4 rounded-lg space-y-2 text-sm">
            <p><strong>AIによる自動生成</strong>：生成された内容は参考として利用し、必要に応じて調整してください</p>
            <p><strong>機密情報</strong>：社外秘の詳細情報は入力を避け、一般的な要件に留めることを推奨します</p>
            <p><strong>最終確認</strong>：見積もり依頼書は内容を十分確認してから利用してください</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-red-800 mb-3">📞 連絡先</h2>
          <div className="bg-red-50 p-4 rounded-lg space-y-2 text-sm">
            <p><strong>作成者</strong>：masuda@moonmile.net</p>
          </div>
        </section>

      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => setShowHelp(false)}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          閉じる
        </button>
      </div>
    </div>
  );

  // Markdown風の簡単なフォーマット処理
  const MessageContent = ({ content }: { content: string }) => {
    const formatContent = (text: string) => {
      // textが undefined や null の場合の安全チェック
      if (!text || typeof text !== 'string') {
        return '';
      }
      
      // **太字**を処理
      let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // 改行を<br>に変換
      formatted = formatted.replace(/\n/g, '<br>');
      
      return formatted;
    };

    // contentが undefined や null の場合の安全チェック
    if (!content) {
      return <div className="text-sm">メッセージが空です</div>;
    }

    return (
      <div 
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    );
  };

  const renderRequirementSection = (title: string, items: RequirementItem[], category: keyof StructuredRequirements, icon: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="font-medium text-blue-800 mb-3 flex items-center">
          <span className="mr-2">{icon}</span>
          {title} ({items.length}件)
        </h3>
        <div className="space-y-2">
          {items.map(req => (
            <div key={req.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{req.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{req.description}</div>
                  {req.priority && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                      req.priority === 'high' ? 'bg-red-100 text-red-800' :
                      req.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {req.priority === 'high' ? '高' : req.priority === 'medium' ? '中' : '低'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeRequirement(category, req.id)}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm font-bold"
                  title="この要件を削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">omitt-chan</h1>
            <p className="text-xs md:text-sm text-gray-600">見積もり依頼作成ツール</p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium flex items-center"
            title="使用方法を確認"
          >
            <span className="mr-1">❓</span>
            ヘルプ
          </button>
        </div>
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
          {/* チャットペイン */}
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

          {/* 要件ペイン */}
          <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">構造化要件</h2>
                <p className="text-sm text-gray-600">
                  入力された要件を整理表示 ({getAllRequirements().length}件)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadRequirementsFromJSON}
                  className="text-xs px-3 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 focus:outline-none"
                  title="JSONファイルから要件を読み込み"
                >
                  読み込み
                </button>
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
                      onClick={saveRequirementsAsJSON}
                      className="text-xs px-3 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 focus:outline-none"
                      title="構造化要件をJSONファイルで保存"
                    >
                      保存
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
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {renderRequirementSection('機能要件', requirements.functional_requirements, 'functional_requirements', '⚙️')}
              {renderRequirementSection('非機能要件', requirements.non_functional_requirements, 'non_functional_requirements', '🎯')}
              {renderRequirementSection('制約条件', requirements.constraints, 'constraints', '🚫')}
              {renderRequirementSection('希望・要望', requirements.wishes, 'wishes', '💭')}
              {renderRequirementSection('設計指針', requirements.design_guidelines, 'design_guidelines', '🎨')}
              
              {getAllRequirements().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">📝</p>
                  <p className="text-sm">まだ要件が入力されていません</p>
                  <p className="text-xs">左のチャットで要件を入力してください</p>
                </div>
              )}
            </div>
          </div>

          {/* 見積もりペイン */}
          <div className="w-1/3 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">見積もり依頼書</h2>
              <p className="text-sm text-gray-600">自動生成されたテンプレート</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                  {estimateTemplate}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 space-y-2">
              {/* アーキテクチャタイプ選択 */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  アーキテクチャタイプ
                </label>
                <select
                  value={selectedArchitectureType}
                  onChange={(e) => setSelectedArchitectureType(e.target.value as 'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded' | 'mobile_app' | 'game' | 'other')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="web">Webアプリケーション</option>
                  <option value="mobile_app">スマホアプリ</option>
                  <option value="game">ゲーム</option>
                  <option value="cloud">クラウドネイティブ</option>
                  <option value="hybrid">ハイブリッド</option>
                  <option value="on_premise">オンプレミス</option>
                  <option value="embedded">組み込みシステム</option>
                  <option value="other">その他</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedArchitectureType === 'web' && 'ブラウザベースのWebアプリケーション'}
                  {selectedArchitectureType === 'mobile_app' && 'iOS/Androidスマートフォンアプリケーション'}
                  {selectedArchitectureType === 'game' && 'ゲーム開発に特化したアーキテクチャ（モバイル/PC/コンソール）'}
                  {selectedArchitectureType === 'cloud' && 'クラウドサービスを活用したスケーラブルなシステム'}
                  {selectedArchitectureType === 'hybrid' && 'クラウドとオンプレミスを組み合わせた構成'}
                  {selectedArchitectureType === 'on_premise' && '自社サーバーでの運用を前提とした構成'}
                  {selectedArchitectureType === 'embedded' && 'ハードウェアに組み込まれたリアルタイムシステム'}
                  {selectedArchitectureType === 'other' && '上記に当てはまらない特殊なシステム構成'}
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
            </div>
          </div>
        </div>

        {/* モバイル版：タブ切り替え */}
        <div className="md:hidden flex-1 flex flex-col">
          {/* チャットタブ */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col bg-white">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map(message => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <MessageContent content={message.content} />
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="space-y-3">
                  <textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="要件を入力してください"
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    rows={3}
                    disabled={isAnalyzing}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isAnalyzing}
                    className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-base"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        分析中...
                      </>
                    ) : (
                      '送信'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 要件タブ */}
          {activeTab === 'requirements' && (
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">構造化要件</h2>
                  <p className="text-sm text-gray-600">
                    入力された要件 ({getAllRequirements().length}件)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadRequirementsFromJSON}
                    className="text-xs px-3 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 focus:outline-none"
                  >
                    読み込み
                  </button>
                  {getAllRequirements().length > 0 && (
                    <>
                      <button
                        onClick={validateRequirements}
                        disabled={isAnalyzing}
                        className="text-xs px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 focus:outline-none disabled:opacity-50"
                      >
                        {isAnalyzing ? '検証中...' : '検証'}
                      </button>
                      <button
                        onClick={saveRequirementsAsJSON}
                        className="text-xs px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 focus:outline-none"
                      >
                        保存
                      </button>
                      <button
                        onClick={clearAllRequirements}
                        className="text-xs px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 focus:outline-none"
                      >
                        全削除
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {renderRequirementSection('機能要件', requirements.functional_requirements, 'functional_requirements', '⚙️')}
                {renderRequirementSection('非機能要件', requirements.non_functional_requirements, 'non_functional_requirements', '🎯')}
                {renderRequirementSection('制約条件', requirements.constraints, 'constraints', '🚫')}
                {renderRequirementSection('希望・要望', requirements.wishes, 'wishes', '💭')}
                {renderRequirementSection('設計指針', requirements.design_guidelines, 'design_guidelines', '🎨')}
                
                {getAllRequirements().length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="mb-3 text-2xl">📝</p>
                    <p className="text-lg mb-2">まだ要件がありません</p>
                    <p className="text-sm">チャットタブで要件を入力してください</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 見積もりタブ */}
          {activeTab === 'estimate' && (
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">見積もり依頼書</h2>
                <p className="text-sm text-gray-600">自動生成されたテンプレート</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {estimateTemplate}
                  </pre>
                </div>
                
                <div className="space-y-4">
                  {/* アーキテクチャタイプ選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      アーキテクチャタイプ
                    </label>
                    <select
                      value={selectedArchitectureType}
                      onChange={(e) => setSelectedArchitectureType(e.target.value as 'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded' | 'mobile_app' | 'game' | 'other')}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="web">Webアプリケーション</option>
                      <option value="mobile_app">スマホアプリ</option>
                      <option value="game">ゲーム</option>
                      <option value="cloud">クラウドネイティブ</option>
                      <option value="hybrid">ハイブリッド</option>
                      <option value="on_premise">オンプレミス</option>
                      <option value="embedded">組み込みシステム</option>
                      <option value="other">その他</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedArchitectureType === 'web' && 'ブラウザベースのWebアプリケーション'}
                      {selectedArchitectureType === 'mobile_app' && 'iOS/Androidスマートフォンアプリケーション'}
                      {selectedArchitectureType === 'game' && 'ゲーム開発に特化したアーキテクチャ（モバイル/PC/コンソール）'}
                      {selectedArchitectureType === 'cloud' && 'クラウドサービスを活用したスケーラブルなシステム'}
                      {selectedArchitectureType === 'hybrid' && 'クラウドとオンプレミスを組み合わせた構成'}
                      {selectedArchitectureType === 'on_premise' && '自社サーバーでの運用を前提とした構成'}
                      {selectedArchitectureType === 'embedded' && 'ハードウェアに組み込まれたリアルタイムシステム'}
                      {selectedArchitectureType === 'other' && '上記に当てはまらない特殊なシステム構成'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => generateSystemArchitecture()}
                    disabled={isGeneratingArchitecture || getAllRequirements().length === 0}
                    className="w-full px-6 py-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-base"
                  >
                    {isGeneratingArchitecture ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        システム構成生成中...
                      </>
                    ) : (
                      'システム構成を生成'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ヘルプモーダル */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto">
            <HelpContent />
          </div>
        </div>
      )}
    </div>
  );
}
