"use client"

import { useEffect, useState } from "react"

export default function RoleTree() {
  const [tree, setTree] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/admin/roles/tree")
      .then((res) => res.json())
      .then(setTree)
  }, [])

  function renderNode(node: any) {
    return (
      <li key={node.id} className="ml-4">
        <span className="font-medium">{node.displayName}</span>
        {node.children?.length > 0 && (
          <ul className="border-l pl-4 mt-2">
            {node.children.map(renderNode)}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="bg-white shadow rounded-xl p-6">
      <h2 className="font-semibold mb-4">Role Hierarchy</h2>
      <ul>{tree.map(renderNode)}</ul>
    </div>
  )
}
