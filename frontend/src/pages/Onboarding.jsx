import { useState } from 'react';
import axios from 'axios';
import { ArrowRight, CheckCircle, UserPlus, MonitorPlay, Zap } from 'lucide-react';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [parentData, setParentData] = useState({
    name: '', email: '', password: '', phone: ''
  });
  
  const [preferences, setPreferences] = useState({
    monitorActivity: true,
    aiActsAsParent: true,
    focusOnEducation: true,
    allowExploration: true
  });
  
  const [childrenData, setChildrenData] = useState([
    { name: '', age: '', interests: '', mode: 'balanced' }
  ]);

  const [responseDetails, setResponseDetails] = useState(null);

  // Handlers
  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const addChild = () => {
    setChildrenData([...childrenData, { name: '', age: '', interests: '', mode: 'balanced' }]);
  };

  const updateChild = (index, field, value) => {
    const updated = [...childrenData];
    updated[index][field] = value;
    setChildrenData(updated);
  };

  const submitOnboarding = async () => {
    setLoading(true);
    setError('');
    
    // Formatting interests string into array
    const formattedChildren = childrenData.map(child => ({
      ...child,
      age: parseInt(child.age),
      interests: child.interests.split(',').map(i => i.trim())
    }));

    try {
      const { data } = await axios.post('/api/auth/register', {
        parentData,
        preferences,
        childrenData: formattedChildren
      });

      setResponseDetails(data);
      setStep(5); // Jump to Codes screen
    } catch (err) {
      setError(err.response?.data?.message || 'Error during submission');
    } finally {
      setLoading(false);
    }
  };

  // Views
  const renderWelcome = () => (
    <div className="text-center">
      <div className="mx-auto rounded-full w-16 h-16 flex items-center justify-center mb-6 text-gray-800" style={{ background: '#FBEC6B' }}>
        <MonitorPlay size={32} />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome to <span className="font-khoj font-normal">Khoj</span></h1>
      <p className="text-lg text-gray-500 mb-8">Turn your child’s screen time into growth time.</p>
      <button 
        onClick={handleNext}
        className="w-full sm:w-auto px-8 py-3 rounded-lg font-bold hover:brightness-105 transition text-gray-800" style={{ background: '#FBEC6B' }}
      >
        Get Started
      </button>
    </div>
  );

  const renderParentDetails = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Parent Details</h2>
      <div className="space-y-4">
        <input 
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-[#FBEC6B]/30 focus:ring-2 focus:border-[#FBEC6B] outline-none"
          placeholder="Name"
          value={parentData.name} 
          onChange={(e) => setParentData({...parentData, name: e.target.value})} 
        />
        <input 
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-[#FBEC6B]/30 focus:ring-2 focus:border-[#FBEC6B] outline-none"
          type="email"
          placeholder="Email Address" 
          value={parentData.email} 
          onChange={(e) => setParentData({...parentData, email: e.target.value})} 
        />
        <input 
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
          type="password" 
          placeholder="Password" 
          value={parentData.password} 
          onChange={(e) => setParentData({...parentData, password: e.target.value})} 
        />
        <input 
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
          placeholder="Phone Number (10 digits)" 
          value={parentData.phone} 
          onChange={(e) => setParentData({...parentData, phone: e.target.value})} 
        />
      </div>
      <div className="flex justify-between mt-8">
        <button onClick={handleBack} className="text-gray-600 hover:text-gray-900">Back</button>
        <button onClick={handleNext} className="px-6 py-2 rounded-xl font-bold text-gray-800" style={{ background: '#FBEC6B' }}>Next</button>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Parenting Preferences</h2>
      <p className="text-sm text-gray-500 mb-6">How would you like AI to guide your child?</p>
      
      <div className="space-y-4">
        {Object.entries(preferences).map(([key, value]) => (
          <label key={key} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input 
              type="checkbox" 
              checked={value}
              onChange={() => setPreferences({...preferences, [key]: !value})}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-3 font-medium text-gray-700">
              {key === 'monitorActivity' ? "Monitor my child's activity" : 
               key === 'aiActsAsParent' ? "Let AI act like a mentor/parent" : 
               key === 'focusOnEducation' ? "Focus more on educational content" : 
               "Allow fun + learning balance"}
            </span>
          </label>
        ))}
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={handleBack} className="text-gray-600 hover:text-gray-900">Back</button>
        <button onClick={handleNext} className="px-6 py-2 rounded-xl font-bold text-gray-800" style={{ background: '#FBEC6B' }}>Next</button>
      </div>
    </div>
  );

  const renderAddChild = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add Child Profile</h2>
        <button onClick={addChild} className="text-indigo-600 flex items-center text-sm font-medium">
          <UserPlus size={16} className="mr-1"/> Add Another
        </button>
      </div>

      <div className="space-y-8">
        {childrenData.map((child, idx) => (
          <div key={idx} className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4 relative">
            <h3 className="font-semibold text-gray-700">Child #{idx + 1}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <input className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" placeholder="Name" value={child.name} onChange={e => updateChild(idx, 'name', e.target.value)} />
              <input className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" type="number" placeholder="Age" value={child.age} onChange={e => updateChild(idx, 'age', e.target.value)} />
            </div>
            
            <input className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" placeholder="Interests (comma separated: Space, AI, Nature)" value={child.interests} onChange={e => updateChild(idx, 'interests', e.target.value)} />
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Content Mode</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white" value={child.mode} onChange={e => updateChild(idx, 'mode', e.target.value)}>
                <option value="strict">Strict (more educational)</option>
                <option value="balanced">Balanced (default)</option>
                <option value="fun">Fun (engaging content)</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

      <div className="flex justify-between mt-8">
        <button onClick={handleBack} className="text-gray-600 hover:text-gray-900">Back</button>
        <button onClick={submitOnboarding} disabled={loading} className="px-6 py-2 rounded-xl font-bold text-gray-800 disabled:opacity-50 flex items-center hover:brightness-105" style={{ background: '#FBEC6B' }}>
          {loading ? 'Processing...' : 'Complete & Generate Codes'} <ArrowRight size={16} className="ml-2"/>
        </button>
      </div>
    </div>
  );

  const renderCodes = () => (
    <div className="text-center text-gray-900 w-full max-w-lg mx-auto">
      <Zap size={48} className="mx-auto text-yellow-500 mb-4" />
      <h2 className="text-3xl font-bold mb-2">Success! Setup Complete.</h2>
      <p className="text-gray-500 mb-8">Save these unique linking codes. Your children will use them to securely log in.</p>
      
      <div className="bg-white border text-left border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden mb-8 shadow-sm">
        {responseDetails?.childrenAccounts?.map((child, idx) => (
          <div key={idx} className="p-5 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 flex items-center justify-center rounded-full font-bold text-lg">
                {child.name.charAt(0)}
              </div>
              <span className="font-semibold text-lg text-gray-800">{child.name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <code className="text-2xl font-mono font-bold tracking-widest text-gray-800 px-3 py-1 rounded-xl border-2 border-[#FBEC6B]" style={{ background: 'rgba(251,236,107,0.2)' }}>
                {child.linkCode}
              </code>
              <button 
                onClick={() => navigator.clipboard.writeText(child.linkCode)}
                className="text-sm font-medium text-gray-500 hover:text-indigo-600 underline"
              >
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setStep(6)} className="w-full p-4 rounded-xl font-bold text-gray-800 shadow-md hover:brightness-105" style={{ background: '#FBEC6B' }}>
        Go to Parent Dashboard
      </button>
    </div>
  );

  const renderCompletion = () => (
    <div className="text-center">
      <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
      <p className="text-gray-500 mb-8">Redirecting to your new Parent Dashboard...</p>
      <div className="animate-pulse bg-gray-200 h-2 w-48 mx-auto rounded-full"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(150deg, #FFF9DB 0%, #FEF3C7 25%, #FFFBEB 50%, #FEFCE8 75%, #FFF7ED 100%)' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {step > 1 && step < 5 && (
            <div className="mb-8 flex justify-center">
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(num => (
                        <div key={num} className={`h-2 w-12 rounded-full ${step >= num ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                    ))}
                </div>
            </div>
        )}
        <div className="py-10 px-6 shadow-xl rounded-3xl sm:px-10 border-2 border-white/60" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}>
          {step === 1 && renderWelcome()}
          {step === 2 && renderParentDetails()}
          {step === 3 && renderPreferences()}
          {step === 4 && renderAddChild()}
          {step === 5 && renderCodes()}
          {step === 6 && renderCompletion()}
        </div>
      </div>
    </div>
  );
}