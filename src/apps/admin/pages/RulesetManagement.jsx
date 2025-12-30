import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Edit3,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

import RulesetForm from '../components/RulesetForm'
import GoalTypeManagement from '../components/GoalTypeManagement'
import RulesetService from '../../../layers/application/services/RulesetService'
import SeasonService from '../../../layers/application/services/SeasonService'

const formatDateTime = (value) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const statusBadgeClass = (isActive) =>
  isActive
    ? 'inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'
    : 'inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600'

const RulesetManagement = () => {
  const [rulesets, setRulesets] = useState([])
  const [selectedRulesetId, setSelectedRulesetId] = useState(null)
  const [selectedRuleset, setSelectedRuleset] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAssigningSeason, setIsAssigningSeason] = useState(false)
  const [seasonAssignmentInput, setSeasonAssignmentInput] = useState('')
  const [seasonOptions, setSeasonOptions] = useState([])
  const [seasonOptionsLoading, setSeasonOptionsLoading] = useState(false)
  const [detailReloadKey, setDetailReloadKey] = useState(0)

  const loadRulesets = useCallback(
    async ({ preferredId, silent = false } = {}) => {
      if (!silent) {
        setListLoading(true)
      }
      try {
        const data = await RulesetService.listRulesets()
        setRulesets(data)

        setSelectedRulesetId((currentId) => {
          const desiredId = preferredId ?? currentId
          if (desiredId && data.some((item) => item.id === desiredId)) {
            return desiredId
          }
          return data[0]?.id ?? null
        })
      } catch (error) {
        console.error(error)
        toast.error('Unable to load rulesets.')
        setRulesets([])
        setSelectedRulesetId(null)
      } finally {
        if (!silent) {
          setListLoading(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    loadRulesets()
  }, [loadRulesets])

  useEffect(() => {
    let cancelled = false
    const fetchSeasons = async () => {
      setSeasonOptionsLoading(true)
      try {
        const seasons = await SeasonService.listSeasons()
        if (!cancelled) {
          setSeasonOptions(seasons)
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          toast.error('Unable to load seasons.')
        }
      } finally {
        if (!cancelled) {
          setSeasonOptionsLoading(false)
        }
      }
    }
    fetchSeasons()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSeasonAssignmentInput('')
  }, [selectedRulesetId])

  useEffect(() => {
    if (!selectedRulesetId) {
      setSelectedRuleset(null)
      return
    }

    let cancelled = false
    setDetailLoading(true)

    const fetchDetail = async () => {
      try {
        const detail = await RulesetService.getRulesetById(selectedRulesetId)
        if (!cancelled) {
          setSelectedRuleset(detail)
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          toast.error('Unable to load ruleset details.')
          setSelectedRuleset(null)
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    fetchDetail()

    return () => {
      cancelled = true
    }
  }, [selectedRulesetId, detailReloadKey])

  const filteredRulesets = useMemo(() => {
    if (!searchTerm.trim()) {
      return rulesets
    }
    const keyword = searchTerm.trim().toLowerCase()
    return rulesets.filter(
      (ruleset) =>
        ruleset.name.toLowerCase().includes(keyword) ||
        ruleset.versionTag.toLowerCase().includes(keyword)
    )
  }, [rulesets, searchTerm])

  const stats = useMemo(() => {
    const total = rulesets.length
    const active = rulesets.filter((item) => item.isActive).length
    const latestUpdated = rulesets.reduce((latest, item) => {
      if (!item.updatedAt) {
        return latest
      }
      const time = new Date(item.updatedAt).getTime()
      if (!Number.isFinite(time)) {
        return latest
      }
      return time > latest ? time : latest
    }, 0)
    return {
      total,
      active,
      inactive: total - active,
      latestUpdated: latestUpdated ? formatDateTime(latestUpdated) : 'N/A'
    }
  }, [rulesets])

  const seasonAssignments = selectedRuleset?.seasonAssignments ?? []

  const resolveSeasonLabel = useCallback(
    (assignment) => {
      if (!assignment) {
        return ''
      }
      if (assignment.seasonName) {
        return assignment.seasonName
      }
      const season = seasonOptions.find((item) => item.id === assignment.seasonId)
      return season?.name ?? `Season #${assignment.seasonId}`
    },
    [seasonOptions]
  )

  const closeForm = () => {
    setIsFormOpen(false)
    setFormMode('create')
  }

  const openCreateModal = () => {
    setFormMode('create')
    setIsFormOpen(true)
  }

  const openEditModal = () => {
    if (!selectedRuleset) {
      toast.error('Select a ruleset before editing.')
      return
    }
    setFormMode('edit')
    setIsFormOpen(true)
  }

  const refreshSelectedRuleset = () => {
    setDetailReloadKey((prev) => prev + 1)
  }

  const handleSaveRuleset = async (payload) => {
    setIsSaving(true)
    try {
      const saved = await RulesetService.saveRuleset(payload)
      toast.success(payload.id ? 'Ruleset updated.' : 'Ruleset created.')
      closeForm()
      await loadRulesets({ preferredId: saved.id, silent: true })
      setSelectedRulesetId(saved.id)
      refreshSelectedRuleset()
    } catch (error) {
      console.error(error)
      const message = error?.message ?? 'Unable to save ruleset.'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishRuleset = async () => {
    if (!selectedRulesetId) {
      return
    }
    setIsPublishing(true)
    try {
      await RulesetService.publishRuleset(selectedRulesetId)
      toast.success('Ruleset published.')
      await loadRulesets({ preferredId: selectedRulesetId, silent: true })
      refreshSelectedRuleset()
    } catch (error) {
      console.error(error)
      toast.error('Unable to publish ruleset.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDeleteRuleset = async () => {
    if (!selectedRulesetId) {
      return
    }
    const confirmed = window.confirm(
      'Deleting a ruleset will remove all of its constraints. This action cannot be undone. Continue?'
    )
    if (!confirmed) {
      return
    }
    setIsDeleting(true)
    try {
      await RulesetService.deleteRuleset(selectedRulesetId)
      toast.success('Ruleset deleted.')
      setSelectedRuleset(null)
      await loadRulesets()
    } catch (error) {
      console.error(error)
      toast.error('Unable to delete ruleset.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAssignSeason = async (event) => {
    event.preventDefault()
    if (!selectedRulesetId) {
      return
    }
    const value = seasonAssignmentInput.trim()
    const seasonId = Number(value)
    if (!value || !Number.isFinite(seasonId) || seasonId <= 0 || !Number.isInteger(seasonId)) {
      toast.error('Enter a valid season identifier.')
      return
    }

    setIsAssigningSeason(true)
    try {
      await RulesetService.assignRulesetToSeason(seasonId, selectedRulesetId)
      toast.success(`Ruleset linked to season ${seasonId}.`)
      setSeasonAssignmentInput('')
      refreshSelectedRuleset()
    } catch (error) {
      console.error(error)
      toast.error('Unable to assign ruleset to season.')
    } finally {
      setIsAssigningSeason(false)
    }
  }

  const modalInitialData =
    formMode === 'edit' && selectedRuleset
      ? {
          id: selectedRuleset.id,
          name: selectedRuleset.name,
          versionTag: selectedRuleset.versionTag,
          description: selectedRuleset.description ?? '',
          parameters: selectedRuleset.parameters
        }
      : {}

  return (
    <div className="space-y-6 p-6">
      <Toaster position="top-right" />

      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-600">Module 2.7</p>
          <h1 className="text-3xl font-bold text-gray-900">Ruleset governance</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Manage regulation bundles, publish updates, and keep squad constraints aligned with each season.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Create ruleset
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Total bundles</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-green-600">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Last refresh</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{stats.latestUpdated}</p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Find by name or version tag..."
            />
          </div>
          <button
            type="button"
            onClick={() => loadRulesets()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw size={16} />
            Reload list
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,1.9fr]">
          <div className="rounded-lg border border-gray-200 bg-white">
            {listLoading ? (
              <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
                Loading rulesets...
              </div>
            ) : filteredRulesets.length === 0 ? (
              <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-gray-500">
                No rulesets match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Ruleset</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Effective</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRulesets.map((ruleset) => {
                      const isSelected = ruleset.id === selectedRulesetId
                      return (
                        <tr
                          key={ruleset.id}
                          className={`cursor-pointer ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedRulesetId(ruleset.id)}
                        >
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{ruleset.name}</p>
                            <p className="text-xs text-gray-500">Version {ruleset.versionTag}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <p>Start: {formatDateTime(ruleset.effectiveFrom)}</p>
                            <p>End: {formatDateTime(ruleset.effectiveTo)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={statusBadgeClass(ruleset.isActive)}>
                              {ruleset.isActive ? (
                                <>
                                  <ShieldCheck size={14} /> Active
                                </>
                              ) : (
                                <>
                                  <ShieldAlert size={14} /> Draft
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDateTime(ruleset.updatedAt ?? ruleset.createdAt)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {detailLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Loading details...
            </div>
          ) : !selectedRuleset ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-gray-500">
              <ShieldAlert className="mb-3 h-8 w-8 text-gray-300" />
              Select a ruleset from the left-hand list to inspect it.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-gray-900">{selectedRuleset.name}</h2>
                    <span className={statusBadgeClass(selectedRuleset.isActive)}>
                      {selectedRuleset.isActive ? (
                        <>
                          <CheckCircle2 size={14} /> Active
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={14} /> Draft
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Version {selectedRuleset.versionTag}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                  {!selectedRuleset.isActive && (
                    <button
                      type="button"
                      onClick={handlePublishRuleset}
                      disabled={isPublishing}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPublishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={refreshSelectedRuleset}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteRuleset}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                    Delete
                  </button>
                </div>
              </div>

              {selectedRuleset.description && (
                <p className="mt-4 text-sm text-gray-700">{selectedRuleset.description}</p>
              )}

              <dl className="mt-6 grid gap-4 text-sm text-gray-600 md:grid-cols-2">
                <div>
                  <dt className="font-semibold text-gray-800">Effective window</dt>
                  <dd className="mt-1">
                    {formatDateTime(selectedRuleset.effectiveFrom)} &rarr;{' '}
                    {formatDateTime(selectedRuleset.effectiveTo)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-800">Last updated</dt>
                  <dd className="mt-1">{formatDateTime(selectedRuleset.updatedAt)}</dd>
                </div>
              </dl>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Player eligibility (QD1)</h3>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>Minimum age: {selectedRuleset.parameters.squad.minAge}</li>
                    <li>Maximum age: {selectedRuleset.parameters.squad.maxAge}</li>
                    <li>Squad size limit: {selectedRuleset.parameters.squad.maxPlayers}</li>
                    <li>
                      Foreign players limit: {selectedRuleset.parameters.squad.maxForeignPlayers}
                    </li>
                  </ul>
                </div>

                <div className="md:col-span-2 rounded-md border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Goal validation (QD3)</h3>
                  <ul className="mb-4 space-y-1 text-sm text-gray-600">
                    <li>
                      Accepted goals: {selectedRuleset.parameters.scoring.goalTypes.join(', ')}
                    </li>
                    <li>
                      Maximum review time: {selectedRuleset.parameters.scoring.maxGoalTime} minutes
                    </li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <GoalTypeManagement 
                      rulesetId={selectedRuleset.id}
                      onGoalTypesChange={(goalTypes) => {
                        // Update selectedRuleset when goal types change
                        if (selectedRuleset) {
                          const updatedGoalTypes = goalTypes.filter(gt => gt.isActive).map(gt => gt.code);
                          setSelectedRuleset({
                            ...selectedRuleset,
                            parameters: {
                              ...selectedRuleset.parameters,
                              scoring: {
                                ...selectedRuleset.parameters.scoring,
                                goalTypes: updatedGoalTypes
                              }
                            }
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 rounded-md border border-gray-100 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Ranking metrics (QD5)</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded border border-gray-200 bg-white p-3 text-center">
                      <p className="text-xs uppercase text-gray-500">Win</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedRuleset.parameters.ranking.points.win} pts
                      </p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-3 text-center">
                      <p className="text-xs uppercase text-gray-500">Draw</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedRuleset.parameters.ranking.points.draw} pts
                      </p>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-3 text-center">
                      <p className="text-xs uppercase text-gray-500">Loss</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedRuleset.parameters.ranking.points.loss} pts
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Tiebreaker order:{' '}
                    <span className="font-medium text-gray-800">
                      {selectedRuleset.parameters.ranking.tiebreakers.join(' > ')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Season assignments</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Link this ruleset to a season so scheduling modules enforce the correct governance bundle.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      {seasonAssignments.length === 0 ? (
                        <li className="text-gray-500">No season is currently linked to this ruleset.</li>
                      ) : (
                        seasonAssignments.map((assignment) => (
                          <li
                            key={assignment.seasonId}
                            className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">
                                {resolveSeasonLabel(assignment)}
                              </span>
                              <span className="text-xs text-gray-500">Season #{assignment.seasonId}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              Linked {formatDateTime(assignment.assignedAt)}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <form
                    onSubmit={handleAssignSeason}
                    className="w-full max-w-xs rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      Select season
                    </label>
                    <select
                      value={seasonAssignmentInput}
                      onChange={(event) => setSeasonAssignmentInput(event.target.value)}
                      disabled={seasonOptionsLoading || seasonOptions.length === 0}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <option value="">Choose a season</option>
                      {seasonOptions.map((season) => (
                        <option key={season.id} value={season.id ?? ''}>
                          {season.name}
                          {season.code ? ` (${season.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      {seasonOptionsLoading
                        ? 'Loading seasons...'
                        : seasonOptions.length === 0
                          ? 'No seasons available yet.'
                          : 'Need a season? Add it from the Season Management screen.'}
                    </p>
                    <button
                      type="submit"
                      disabled={
                        isAssigningSeason || seasonOptionsLoading || !seasonAssignmentInput
                      }
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAssigningSeason ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 size={16} />
                      )}
                      Assign to season
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="mt-10 w-full max-w-3xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {formMode === 'create' ? 'Create ruleset' : 'Edit ruleset'}
                </h2>
                <p className="text-sm text-gray-500">
                  Define the ruleset name and the enforced parameters.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="mt-6 max-h-[80vh] overflow-y-auto">
              <RulesetForm
                initialData={modalInitialData}
                onSave={handleSaveRuleset}
                onCancel={closeForm}
                isSubmitting={isSaving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RulesetManagement
