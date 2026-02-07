'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, User, Plus, Check, Mail, Phone, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  country: string
  total_bookings: number
  total_spent: number
}

interface NewCustomerData {
  email: string
  first_name: string
  last_name: string
  phone: string
  country: string
}

interface CustomerSearchSelectProps {
  selectedCustomerId?: string
  selectedCustomerData?: NewCustomerData
  preselectedCustomer?: Customer
  onCustomerSelect: (customerId: string, customer: Customer) => void
  onNewCustomerData: (data: NewCustomerData) => void
  locale?: string
}

export function CustomerSearchSelect({
  selectedCustomerId,
  selectedCustomerData,
  preselectedCustomer,
  onCustomerSelect,
  onNewCustomerData,
  locale = 'vi'
}: CustomerSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState<NewCustomerData>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    country: 'Vietnam'
  })
  const [emailError, setEmailError] = useState<string>('')

  const searchRef = useRef<HTMLDivElement>(null)

  // Initialize selectedCustomer from preselectedCustomer prop when copying booking
  useEffect(() => {
    // Only set selectedCustomer if preselectedCustomer has valid data (has id and name)
    if (preselectedCustomer && preselectedCustomer.id && preselectedCustomer.first_name && !selectedCustomer) {
      setSelectedCustomer(preselectedCustomer)
      setShowNewCustomerForm(false)
    }

    // Reset internal state when prop is cleared or invalid
    if ((!preselectedCustomer || !preselectedCustomer.id) && selectedCustomer && !selectedCustomerId) {
      setSelectedCustomer(null)
    }
  }, [preselectedCustomer])

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setCustomers([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/customers?search=${encodeURIComponent(searchQuery.trim())}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setCustomers(data.data || [])
          setShowResults(true)
        }
      } catch (error) {
        console.error('Error searching customers:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    onCustomerSelect(customer.id, customer)
    setSearchQuery('')
    setShowResults(false)
    setShowNewCustomerForm(false)
  }

  const handleShowNewForm = () => {
    setShowNewCustomerForm(true)
    setShowResults(false)
    setSearchQuery('')
  }

  const handleNewCustomerChange = (field: keyof NewCustomerData, value: string) => {
    const updated = { ...newCustomer, [field]: value }
    setNewCustomer(updated)
    onNewCustomerData(updated)
  }

  return (
    <div className="space-y-4">
      {/* Show selected customer or new customer form */}
      {!showNewCustomerForm && selectedCustomer && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-medium text-green-900">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </p>
              <p className="text-sm text-green-700">{selectedCustomer.email}</p>
              {selectedCustomer.phone && (
                <p className="text-sm text-green-600">{selectedCustomer.phone}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedCustomer.total_bookings} {locale === 'vi' ? 'booking' : 'bookings'}
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCustomer(null)
                // Pass undefined instead of empty object to properly clear the customer
                onCustomerSelect('', undefined as any)
                setSearchQuery('')
              }}
            >
              {locale === 'vi' ? 'Thay đổi' : 'Change'}
            </Button>
          </div>
        </Card>
      )}

      {/* Search or new customer form */}
      {!selectedCustomerId && (
        <>
          {/* Toggle buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!showNewCustomerForm ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowNewCustomerForm(false)}
              className="w-1/2"
            >
              <Search className="h-4 w-4 mr-2" />
              {locale === 'vi' ? 'Tìm khách có sẵn' : 'Search Existing'}
            </Button>
            <Button
              type="button"
              variant={showNewCustomerForm ? 'default' : 'outline'}
              size="sm"
              onClick={handleShowNewForm}
              className="w-1/2"
            >
              <Plus className="h-4 w-4 mr-2" />
              {locale === 'vi' ? 'Tạo khách mới' : 'Create New'}
            </Button>
          </div>

          {/* Search existing customer */}
          {!showNewCustomerForm && (
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={locale === 'vi' ? 'Tìm theo tên, email, hoặc số điện thoại...' : 'Search by name, email, or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                  className="pl-10"
                />
              </div>

              {/* Search results dropdown */}
              {showResults && (
                <Card className="absolute z-10 w-full mt-1 max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">
                      {locale === 'vi' ? 'Đang tìm...' : 'Searching...'}
                    </div>
                  ) : customers.length > 0 ? (
                    <div className="py-1">
                      {customers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full px-3 py-2 hover:bg-gray-100 text-left transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm">
                                {customer.first_name} {customer.last_name}
                              </p>
                              <p className="text-xs text-gray-600 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </p>
                              {customer.phone && (
                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {customer.total_bookings}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {locale === 'vi' ? 'Không tìm thấy khách hàng' : 'No customers found'}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* New customer form */}
          {showNewCustomerForm && (
            <Card className="p-4 space-y-3">
              <h4 className="font-medium text-sm">
                {locale === 'vi' ? 'Thông tin khách hàng mới' : 'New Customer Information'}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-first-name" className="text-sm">
                    {locale === 'vi' ? 'Tên' : 'First Name'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-first-name"
                    type="text"
                    value={newCustomer.first_name}
                    onChange={(e) => handleNewCustomerChange('first_name', e.target.value)}
                    placeholder={locale === 'vi' ? 'Nhập tên' : 'Enter first name'}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-last-name" className="text-sm">
                    {locale === 'vi' ? 'Họ' : 'Last Name'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new-last-name"
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) => handleNewCustomerChange('last_name', e.target.value)}
                    placeholder={locale === 'vi' ? 'Nhập họ' : 'Enter last name'}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-email" className="text-sm">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => {
                    handleNewCustomerChange('email', e.target.value)
                    if (emailError) setEmailError('')
                  }}
                  onBlur={() => {
                    if (newCustomer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
                      setEmailError(locale === 'vi' ? 'Email không hợp lệ' : 'Invalid email')
                    } else {
                      setEmailError('')
                    }
                  }}
                  className={cn(emailError && 'border-red-500 focus-visible:ring-red-500')}
                  placeholder={locale === 'vi' ? 'Nhập email' : 'Enter email'}
                />
                {emailError && (
                  <p className="text-xs text-red-500">{emailError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-phone" className="text-sm">
                    {locale === 'vi' ? 'Số điện thoại' : 'Phone'}
                  </Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => handleNewCustomerChange('phone', e.target.value)}
                    placeholder="+84"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-country" className="text-sm">
                    {locale === 'vi' ? 'Quốc gia' : 'Country'}
                  </Label>
                  <Input
                    id="new-country"
                    type="text"
                    value={newCustomer.country}
                    onChange={(e) => handleNewCustomerChange('country', e.target.value)}
                    placeholder="Vietnam"
                  />
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
