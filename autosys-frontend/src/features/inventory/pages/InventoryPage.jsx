import React, { useEffect, useMemo, useState } from "react"
import { Plus, Search, RefreshCw, Trash2, Edit } from "lucide-react"
import { useSalesStore } from "../../../store/salesStore"

const InventoryPage = () => {
  const {
    vehicles,
    loading,
    error,
    fetchVehicles,
    deleteVehicle,
  } = useSalesStore()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchVehicles()
  }, [])

  const filteredVehicles = useMemo(() => {
    let data = [...vehicles]

    if (search) {
      const query = search.toLowerCase()

      data = data.filter((vehicle) =>
        `${vehicle.make || ""} ${vehicle.model || ""} ${vehicle.year || ""}`
          .toLowerCase()
          .includes(query)
      )
    }

    if (statusFilter !== "all") {
      data = data.filter(
        (vehicle) => vehicle.status === statusFilter
      )
    }

    return data
  }, [vehicles, search, statusFilter])

  const totalVehicles = vehicles.length

  const availableVehicles = vehicles.filter(
    (v) => v.status === "available"
  ).length

  const soldVehicles = vehicles.filter(
    (v) => v.status === "sold"
  ).length

  const reservedVehicles = vehicles.filter(
    (v) => v.status === "reserved"
  ).length

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Inventory Management
          </h1>

          <p className="text-gray-500 mt-1">
            Manage dealership vehicles and inventory.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchVehicles}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            <Plus size={18} />
            Add Vehicle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm">Total Vehicles</h3>
          <p className="text-3xl font-bold mt-2">{totalVehicles}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm">Available</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">
            {availableVehicles}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm">Reserved</h3>
          <p className="text-3xl font-bold mt-2 text-yellow-600">
            {reservedVehicles}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm">Sold</h3>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            {soldVehicles}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Loading inventory...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">
            {error}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No vehicles found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Vehicle
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Price
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Mileage
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Status
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {vehicle.make} {vehicle.model}
                        </h4>

                        <p className="text-sm text-gray-500">
                          {vehicle.year}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      ₦{Number(vehicle.price || 0).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {vehicle.mileage || 0} km
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          vehicle.status === "available"
                            ? "bg-green-100 text-green-700"
                            : vehicle.status === "sold"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100">
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={() => deleteVehicle(vehicle.id)}
                          className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryPage