'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AddressAutocomplete } from '../../components/ui/AddressAutocomplete';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface TeamMember {
  name: string;
  email: string;
  role: 'GENERAL_CONTRACTOR' | 'ARCHITECT_DESIGNER' | 'PROJECT_MANAGER';
}

interface AddressData {
  placeId: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  country?: string;
  postalCode?: string;
}

const STORAGE_KEY = 'nailit_project_form_data';

export default function CreateProject() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    addressData: null as AddressData | null,
    budget: '',
    budgetNumeric: 0,
    startDate: '',
    endDate: '',
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { name: '', email: '', role: 'GENERAL_CONTRACTOR' }
  ]);

  // Load saved form data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      setHasSavedData(true);
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData.formData || formData);
        setTeamMembers(parsedData.teamMembers || teamMembers);
      } catch (error) {
        console.error('Error loading saved form data:', error);
        localStorage.removeItem(STORAGE_KEY);
        setHasSavedData(false);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        formData,
        teamMembers,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setHasSavedData(true);
    }, 500); // Debounce by 500ms to avoid interference with autocomplete

    return () => clearTimeout(timeoutId);
  }, [formData, teamMembers]);

  // Clear saved data when component unmounts or project is created
  const clearSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedData(false);
  };

  // Google Maps API key - you'll need to set this in your environment
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (value: string, addressData?: AddressData) => {
    setFormData(prev => ({
      ...prev,
      address: value,
      addressData: addressData || null
    }));
  };

  const handleBudgetChange = (value: string, numericValue: number) => {
    setFormData(prev => ({
      ...prev,
      budget: value,
      budgetNumeric: numericValue
    }));
  };

  const handleTeamMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    const updatedMembers = [...teamMembers];
    // Prevent changing the role of the first team member (General Contractor)
    if (index === 0 && field === 'role') {
      return; // Don't allow role change for first member
    }
    updatedMembers[index] = {
      ...updatedMembers[index],
      [field]: value
    };
    
    // Extra safeguard: Always ensure first member is GENERAL_CONTRACTOR
    if (index === 0) {
      updatedMembers[0].role = 'GENERAL_CONTRACTOR';
    }
    
    setTeamMembers(updatedMembers);
  };

  const addTeamMember = () => {
    setTeamMembers(prev => [...prev, { name: '', email: '', role: 'ARCHITECT_DESIGNER' }]);
  };

  const removeTeamMember = (index: number) => {
    // Don't allow removing the first team member (General Contractor)
    if (index === 0) {
      return;
    }
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'GENERAL_CONTRACTOR':
        return 'General Contractor';
      case 'ARCHITECT_DESIGNER':
        return 'Architect/Designer';
      case 'PROJECT_MANAGER':
        return 'Project Manager';
      default:
        return role;
    }
  };

  // Get available roles for team member (excluding General Contractor for non-first members)
  const getAvailableRoles = (index: number) => {
    if (index === 0) {
      // First member is always General Contractor
      return [{ value: 'GENERAL_CONTRACTOR', label: 'General Contractor' }];
    }
    
    // Additional members cannot be General Contractor
    return [
      { value: 'ARCHITECT_DESIGNER', label: 'Architect/Designer' },
      { value: 'PROJECT_MANAGER', label: 'Project Manager' }
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validate required fields
    if (!formData.name || !formData.description || !formData.address || !formData.startDate || !formData.endDate || !formData.budget) {
      alert('Please fill in all required fields')
      setLoading(false)
      return
    }

    // Validate General Contractor
    if (!teamMembers[0]?.name || !teamMembers[0]?.email) {
      alert('General Contractor name and email are required')
      setLoading(false)
      return
    }

    try {
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Form data being sent:', {
        ...formData,
        teamMembers,
      });

      const requestData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        addressData: formData.addressData,
        budget: formData.budgetNumeric || parseFloat(formData.budget.replace(/[,$]/g, '')) || 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        teamMembers,
      };

      console.log('Processed request data:', requestData);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        clearSavedData() // Clear saved form data on success
        router.push('/projects')
      } else {
        const errorData = await response.json()
        console.error('Error creating project:', errorData)
        alert(`Error creating project: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error creating project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Your Project</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Set up your renovation project to start monitoring communications
          </p>
          {hasSavedData && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                ✅ Form data auto-saved
              </div>
              <button
                onClick={clearSavedData}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear saved data
              </button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Basic Info */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  placeholder="e.g., Kitchen Renovation"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  placeholder="Brief description of the project..."
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Address *
                </label>
                {GOOGLE_MAPS_API_KEY ? (
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={handleAddressChange}
                    placeholder="Start typing an address..."
                    apiKey={GOOGLE_MAPS_API_KEY}
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      id="address"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                      placeholder="123 Main St, City, State"
                    />
                    <p className="text-xs text-amber-600">
                      Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable to enable address autocomplete
                    </p>
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Team Members</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    The General Contractor is required as the primary contact. You can add additional team members like architects, designers, or project managers whose communications should also be monitored.
                  </p>
                </div>
                
                {teamMembers.map((member, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        {index === 0 ? 'General Contractor' : `Team Member ${index + 1}`}
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>
                        )}
                      </h4>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeTeamMember(index)}
                          className="text-red-600 border-red-300 hover:bg-red-50 w-full sm:w-auto min-h-[44px]"
                        >
                          <TrashIcon className="w-4 h-4 mr-2 sm:mr-0" />
                          <span className="sm:hidden">Remove Team Member</span>
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                          placeholder="John Doe"
                        />
                      </div>
                      
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => handleTeamMemberChange(index, 'email', e.target.value)}
                          className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                          placeholder="john@example.com"
                        />
                      </div>
                      
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Role *
                        </label>
                        <select
                          value={member.role}
                          onChange={(e) => handleTeamMemberChange(index, 'role', e.target.value as TeamMember['role'])}
                          disabled={index === 0}
                          className={`w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm ${
                            index === 0 ? 'bg-gray-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {getAvailableRoles(index).map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTeamMember}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Additional Team Member
                </Button>
              </div>

              {/* Project Timeline & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Estimated) *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    required
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                    Budget *
                  </label>
                  <CurrencyInput
                    value={formData.budget}
                    onChange={handleBudgetChange}
                    placeholder="Enter project budget"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 sm:pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] text-base font-medium"
                >
                  {loading ? 'Creating Project...' : 'Create Project & Start Monitoring'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 sm:mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            What happens next?
          </h4>
          <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
            <li>• NailIt will automatically monitor emails from all team members</li>
            <li>• AI will scan for important changes in pricing, scope, and schedule</li>
            <li>• You'll receive alerts when significant changes are detected</li>
            <li>• All project communications will be tracked in your timeline</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 