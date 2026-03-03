export default function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      width: '100%',
    }}>
      <div
        className="spinner"
        style={{
          width: 20,
          height: 20,
          border: '2px solid var(--separator)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}
