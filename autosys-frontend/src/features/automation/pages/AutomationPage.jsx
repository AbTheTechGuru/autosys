              <p className="text-[13px] font-semibold mt-3">No automations yet</p>
              <p className="text-[12px] mt-1">Click "+ New Automation" to get started</p>
            </div>
          ) : (
            filtered.map((auto) => (
              <AutomationRow
                key={auto.id}
                automation={auto}
                onToggle={handleToggle}
                onEdit={(a) => { setEditing(a); setShowBuilder(true); }}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onTestRun={handleTestRun}
              />
            ))
          )}
        </div>
      )}

      {/* Variable reference */}
      <div className="mt-6 bg-surface-1 border border-surface-4 rounded-[14px] p-4">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Available Template Variables</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[
            '{{lead.name}}','{{lead.phone}}','{{lead.email}}','{{lead.stage}}',
            '{{lead.vehicle_interest}}','{{dealer.name}}','{{dealer.phone}}',
            '{{vehicle.brand}}','{{vehicle.model}}','{{vehicle.year}}','{{vehicle.price}}',
            '{{deal.stage}}','{{deal.value}}','{{payment.amount}}','{{trigger}}','{{date}}',
          ].map((v) => (
            <code key={v} className="text-[10.5px] font-mono text-gold bg-surface-2 border border-surface-4 px-2 py-1 rounded-[5px] truncate">
              {v}
            </code>
          ))}
        </div>
      </div>

      <BuilderModal
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditing(null); }}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}