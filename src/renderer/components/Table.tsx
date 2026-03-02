'use client';

export interface Column<T> {
    header: string;
    accessor: keyof T | ((row: T) => any);
    className?: string;
    render?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
}

export default function Table<T>({ columns, data }: TableProps<T>) {
    return (
        <div
            className="w-full overflow-hidden rounded-xl border"
            style={{ background: 'var(--background-input)', borderColor: 'var(--border)' }}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--background-body)' }}>
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`px-5 py-3 text-xs uppercase tracking-widest ${col.className || ''}`}
                                    style={{ color: 'var(--text-disabled)', fontWeight: 600 }}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="transition-colors duration-150"
                                style={{ borderTop: rowIndex > 0 ? '1px solid var(--surface-1)' : undefined }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--background-subtle)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                {columns.map((col, colIndex) => {
                                    const value = typeof col.accessor === 'function'
                                        ? col.accessor(row)
                                        : row[col.accessor];
                                    return (
                                        <td
                                            key={colIndex}
                                            className={`px-5 py-3.5 ${col.className || ''}`}
                                            style={{ color: 'var(--text-secondary)', fontWeight: 400 }}
                                        >
                                            {col.render ? col.render(value, row) : value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}